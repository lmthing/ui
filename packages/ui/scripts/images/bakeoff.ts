import { createHash } from "node:crypto";
import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import { buildImagePrompt } from "../../src/catalog";
import { azureImageGenerator, imageRequestSize } from "./azure-image";
import { chargeImageUsd, estimateImageUsd, reserveUsd } from "./budget";
import { bakeoffJobs, sampleJobs, type ImageJob } from "./fixtures";

const root = fileURLToPath(new URL("../../shots/images/", import.meta.url));
const maxUsd = 5;
const workersPerDeployment = 3;
const attemptsOnThrottle = 4;
const canary = process.argv.includes("--canary");
const planned = process.argv.includes("--plan");
const sheetsOnly = process.argv.includes("--sheets");
const publishSamples = process.argv.includes("--samples");
const jobs = canary ? bakeoffJobs().slice(0, 3) : [...bakeoffJobs(), ...sampleJobs()];
const onlyRoute = process.argv.find((arg) => arg.startsWith("--route="))?.slice("--route=".length);
const onlyKind = process.argv.find((arg) => arg.startsWith("--kind="))?.slice("--kind=".length);

function identity(job: ImageJob, prompt: string) {
  return createHash("sha256")
    .update(JSON.stringify([job.route.id, imageRequestSize(job.slot.kind, job.route), prompt]))
    .digest("hex");
}

function prepare() {
  return jobs.map((job) => {
    const prompt = buildImagePrompt(job.slot, job.theme);
    return { job, prompt, key: identity(job, prompt) };
  });
}

type Work = ReturnType<typeof prepare>[number];
type Generator = ReturnType<typeof azureImageGenerator>;

async function attempt({ job, prompt }: Work, generate: Generator) {
  for (let n = 0; ; n++) {
    const result = await generate(prompt, job.route, job.slot.kind);
    if (result.ok || result.status !== 429 || n >= attemptsOnThrottle - 1) return result;
    await delay(Math.max(15, result.retryAfter) * 1_000);
  }
}

async function alreadyRendered(key: string) {
  return access(join(root, "outputs", `${key}.jpg`)).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
}

async function checkBudget(work: Work[]) {
  const log = await readFile(join(root, "usage.jsonl"), "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const previous = log
    .trim()
    .split("\n")
    .filter(Boolean)
    .reduce((sum, line) => sum + chargeImageUsd(JSON.parse(line)), 0);
  const pending = await Promise.all(
    work.map(async ({ key, job }) => ((await alreadyRendered(key)) ? 0 : reserveUsd[job.route.id])),
  );
  const estimatedUsd = previous + pending.reduce((sum, reserve) => sum + reserve, 0);
  console.log(`Past usage plus missing cells: $${estimatedUsd.toFixed(2)} estimated ceiling`);
  if (estimatedUsd > maxUsd) throw new Error("Image bake-off exceeds the cumulative $5 budget");
}

async function render(work: Work, generate: Generator) {
  const { job, key } = work;
  const path = join(root, "outputs", `${key}.jpg`);
  if (await alreadyRendered(key)) return true;
  const result = await attempt(work, generate);
  if (!result.ok) {
    console.error(`${job.id}: Azure HTTP ${result.status}`);
    return result.status;
  }
  const { seconds, inputTokens, outputTokens } = result;
  const usd = estimateImageUsd(job.route, inputTokens, outputTokens);
  await writeFile(path, result.jpeg);
  await appendFile(
    join(root, "usage.jsonl"),
    `${JSON.stringify({ key, seconds, inputTokens, outputTokens, usd, reservedUsd: reserveUsd[job.route.id] })}\n`,
  );
  console.log(`${job.id}: ${seconds.toFixed(1)} s, ${outputTokens ?? "unreported"} output tokens`);
  return true;
}

async function runDeployment(work: Work[], generate: Generator) {
  let next = 0;
  let failed = 0;
  let unavailable = false;
  async function worker() {
    while (!unavailable && next < work.length) {
      const item = work[next++]!;
      try {
        const result = await render(item, generate);
        if (result === true) continue;
        failed++;
        unavailable = [400, 401, 403, 404].includes(result);
      } catch {
        failed++;
        console.error(`${item.job.id}: no usable Azure response`);
      }
    }
  }
  // First check all three configurations in serial, so a missing deployment cannot fan out.
  for (const route of new Set(work.map(({ job }) => job.route.id))) {
    const index = work.findIndex(({ job }) => job.route.id === route);
    const first = work[index]!;
    if ((await render(first, generate)) !== true) return work.length;
    work.splice(index, 1);
  }
  await Promise.all(Array.from({ length: workersPerDeployment }, worker));
  return failed + work.length - next;
}

async function main() {
  if (sheetsOnly) {
    const { writeEvidence } = await import("./evidence");
    await writeEvidence(publishSamples);
    return;
  }
  const all = prepare();
  const unique = [...new Map(all.map((work) => [work.key, work])).values()];
  const reserve = unique.reduce((sum, { job }) => sum + reserveUsd[job.route.id], 0);
  console.log(
    `${all.length} cells, ${unique.length} unique requests, $${reserve.toFixed(2)} estimated ceiling`,
  );
  if (reserve > maxUsd) throw new Error("Image bake-off exceeds the $5 budget");
  const selected = unique.filter(
    ({ job }) => (!onlyRoute || job.route.id === onlyRoute) && (!onlyKind || job.slot.kind === onlyKind),
  );
  if (selected.length === 0) throw new Error("No image cells match the selected route and kind");
  if (planned) return;
  await checkBudget(selected);
  const generate = azureImageGenerator();
  await mkdir(join(root, "outputs"), { recursive: true });
  await writeFile(join(root, canary ? "canary.json" : "matrix.json"), JSON.stringify(all, null, 2));
  const models = new Set(selected.map(({ job }) => job.route.model));
  const failed = await Promise.all(
    [...models].map((model) =>
      runDeployment(
        selected.filter(({ job }) => job.route.model === model),
        generate,
      ),
    ),
  );
  if (failed.some(Boolean))
    throw new Error(`${failed.reduce((sum, n) => sum + n, 0)} image cells unavailable`);
  if (!canary && !onlyRoute) {
    const { writeEvidence } = await import("./evidence");
    await writeEvidence(publishSamples);
  }
}

await main();
