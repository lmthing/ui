import { checkCoreComposition } from "./core-compose";
import { checkCoreMerges } from "./core-merges";
// pnpm llm:check [--component List,Header] [--replay]
// Runs component probes live on every model in llm.config.ts, records replies, prints results.
// Exits 1 if any probe fails on a required model.
// Imports the built data-only catalog (dist/catalog.js): the views need React Native, Node does not have it.
import type { ProbeResult } from "@lmthing/ui/catalog";
import type * as Catalog from "@lmthing/ui/catalog";
import { probeModels, type ProbeModel, keyOf, readBook, replayCall, writeBook } from "./index";

const { createRegistry, runProbes, runPackProbes, packs } = (await import(
  new URL("../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;

function arg(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value?.startsWith("--") ? undefined : value;
}

// Transport failures (network, rate limit, server error) are not model answers: retry them with backoff.
async function azure(model: ProbeModel, prompt: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await azureOnce(model, prompt);
    } catch (error) {
      const message = (error as Error).message;
      const transient = /fetch failed|ECONN|ETIMEDOUT|429|5\d\d|high demand|unavailable/i.test(message);
      if (!transient || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    }
  }
}

async function azureOnce(model: ProbeModel, prompt: string): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  const key = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !key) throw new Error("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set");
  const response = await fetch(`${endpoint}/openai/v1/chat/completions`, {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model: model.deployment,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: model.maxTokens,
    }),
  });
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(`unavailable ${response.status}: ${body.error?.message?.slice(0, 80) ?? ""}`);
  return body.choices?.[0]?.message?.content ?? "";
}

function print(model: ProbeModel, results: ProbeResult[]) {
  for (const r of results) {
    const what =
      r.probe.kind === "pack"
        ? r.probe.idea
        : r.probe.kind === "read"
          ? r.probe.task
          : r.probe.kind === "choose"
            ? r.probe.need
            : r.probe.brief;
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${(r.score ?? "").padEnd(4)} ${model.id.padEnd(16)} ${r.component} ${r.probe.kind}: ${what}`,
    );
    if (r.status === "fail" || r.detail.startsWith("unstable"))
      console.log(`        ${r.detail}\n        reply: ${r.reply.trim().slice(0, 300)}`);
  }
}

async function runModel(model: ProbeModel, only: string[], replay: boolean, packMode: boolean) {
  const registry = createRegistry({ includeDrafts: true });
  const ids = only.length ? only : packMode ? Object.keys(packs) : registry.ids;
  const packResults: ProbeResult[] = [];
  let failed = 0;
  for (const id of ids) {
    const recording = packMode ? `pack/${id}` : id;
    const book = readBook(recording, model.id);
    const live = async (prompt: string, sample = 0) => {
      const reply = await azure(model, prompt);
      const key = keyOf(model.id, prompt);
      const replies = [...(sample === 0 ? [] : (book[key]?.replies ?? []))];
      replies[sample] = reply;
      book[key] = { prompt, reply: replies[0] ?? reply, replies };
      return reply;
    };
    try {
      const results = await (packMode ? runPackProbes : runProbes)({
        packs,
        defs: registry.defs,
        callModel: replay ? replayCall(recording, model.id) : live,
        only: [id],
        samples: model.samples,
      });
      if (!replay) writeBook(recording, model.id, book);
      print(model, results);
      if (packMode) packResults.push(...results);
      else if (model.required) failed += results.filter((r) => r.status === "fail").length;
    } catch (error) {
      console.log(`ERROR   ${model.id.padEnd(16)} ${id}: ${(error as Error).message}`);
      if (model.required) failed += 1;
    }
  }
  if (packMode) {
    const accuracy = packResults.length
      ? packResults.filter((r) => r.status === "pass").length / packResults.length
      : 1;
    console.log(
      `${model.id} pack accuracy: ${packResults.length ? `${(accuracy * 100).toFixed(1)}%` : "skipped (no packs)"}; gate >= 90%`,
    );
    if (model.required && accuracy < 0.9) failed++;
  }
  return failed;
}

const packMode = process.argv.includes("--pack");
const only = (arg(packMode ? "--pack" : "--component") ?? "").split(",").filter(Boolean);
const replay = process.argv.includes("--replay");
let failed = 0;
if (process.argv.includes("--compose")) {
  for (const model of probeModels) {
    const failures = await checkCoreComposition(model, (prompt) => azure(model, prompt), replay);
    if (model.required) failed += failures;
  }
} else if (process.argv.includes("--merges")) {
  const result = await checkCoreMerges(
    createRegistry({ includeDrafts: true }).defs,
    probeModels,
    azure,
    replay,
  );
  failed = result.failures;
} else {
  for (const model of probeModels) failed += await runModel(model, only, replay, packMode);
}
console.log(failed ? `\n${failed} failure(s) on required models.` : "\nAll required probes pass.");
process.exit(failed ? 1 : 0);
