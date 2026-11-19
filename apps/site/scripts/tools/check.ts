// tsx scripts/tools/check.ts <baseUrl> <shotsDir>: drives the built site in headless Chromium and asserts the
// live parts work (create stream, playground, packs, try-it tier 3 replay and a mocked tier 1).
import { mkdirSync, readFileSync } from "node:fs";
import type { SiteData } from "../site-types";
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";

const [base = "http://localhost:5199/", shots = "shots"] = process.argv.slice(2);
mkdirSync(shots, { recursive: true });
const data = JSON.parse(
  readFileSync(new URL("../../src/generated/site-data.json", import.meta.url).pathname, "utf8"),
) as SiteData;
type Browser = Awaited<ReturnType<typeof launchChrome>>;
const failures: string[] = [];
const expect = (ok: boolean, what: string) => (
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`),
  ok || failures.push(what)
);

async function open(browser: Browser, width: number, init?: string) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on("pageerror", (e) => failures.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on(
    "console",
    (m) =>
      m.type() === "error" &&
      !/Failed to load resource/.test(m.text()) &&
      failures.push(`console: ${m.text().slice(0, 200)}`),
  );
  if (init) await page.addInitScript(init);
  return page;
}

async function checkCreate(browser: Browser, width: number) {
  const page = await open(browser, width);
  await page.goto(base, { waitUntil: "networkidle" });
  const caption = page.locator(".phone figcaption").first();
  await page.waitForTimeout(1500);
  const early = await caption.textContent();
  await page.waitForTimeout(3500);
  expect(
    (await caption.textContent()) !== early,
    `create stream advances at ${width}px (${early} -> ${await caption.textContent()})`,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `no horizontal scroll at ${width}px`,
  );
  await page.screenshot({ path: `${shots}/home-${width}.png` });
  await page.close();
}

async function checkTry(browser: Browser, width: number, init: string | undefined, label: string) {
  const page = await open(browser, width, init);
  await page.goto(`${base}#try`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Build" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".try .stream .line-in").length >= 3, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(2500);
  const running = await page.locator(".running").textContent();
  expect(running?.includes(label) ?? false, `try-it tier shows "${label}": ${running}`);
  const parts = await page.locator(".try [data-testid^='tryit/']").count();
  expect(parts >= 3, `try-it phone drew ${parts} addressed parts`);
  await page.locator("#try").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/try-${label.split(" ")[0]}-${width}.png` });
  await page.close();
}

async function checkViewAct(browser: Browser) {
  const page = await open(browser, 1280);
  await page.goto(`${base}#llm`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "View and act" }).click();
  await page.getByRole("button", { name: /Show the answer/ }).click();
  await page.waitForSelector(".addr-hit", { timeout: 10000 });
  expect(true, "view and act: the recorded answer's part is highlighted on the phone");
  await page.screenshot({ path: `${shots}/viewact-1280.png` });
  await page.close();
}

async function checkTheme(browser: Browser) {
  const page = await open(browser, 390);
  await page.goto(`${base}#themes`, { waitUntil: "networkidle" });
  const before = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg"),
  );
  await page.getByRole("radio", { name: "dark" }).first().click();
  await page.waitForTimeout(800);
  const after = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg"),
  );
  expect(before !== after, `theme switch changes the page colours (${before} -> ${after})`);
  await page.screenshot({ path: `${shots}/themes-dark-390.png`, fullPage: false });
  await page.close();
}

/** Pages that must render without errors: a planned pack, a draft component, an unknown id. */
async function checkEdges(browser: Browser) {
  const page = await open(browser, 390);
  for (const hash of ["#/p/commerce", "#/c/Dice", "#/c/Nope", "#/p/nope"]) {
    await page.goto(`${base}${hash}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    expect((await page.locator("h1, h2").count()) > 0, `edge page ${hash} renders`);
  }
  await page.goto(`${base}#/p/commerce`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${shots}/pack-planned-390.png`, fullPage: true });
  await page.close();
}

async function checkPlayground(browser: Browser) {
  const page = await open(browser, 1280);
  await page.goto(`${base}#/c/List`, { waitUntil: "networkidle" });
  const before = await page.locator("pre.code").first().textContent();
  const field = page.locator(".pg-controls input[type=text]").first();
  await field.fill("Zebra plant");
  await page.waitForTimeout(500);
  const after = await page.locator("pre.code").first().textContent();
  expect(
    before !== after && (after?.includes("Zebra plant") ?? false),
    "playground: editing a control updates the JSON line",
  );
  expect(
    (await page.locator(".phone [data-testid^='play/']").count()) > 0,
    "playground: phone shows addressed parts",
  );
  await page.screenshot({ path: `${shots}/playground-1280.png` });
  await page.close();
}

async function checkPack(browser: Browser, width: number) {
  const page = await open(browser, width);
  await page.goto(`${base}#/p/booking`, { waitUntil: "networkidle" });
  await page.waitForSelector(".showcase .phone");
  expect(
    (await page.locator(".showcase .phone").count()) === data.presets.length,
    "pack page: worked example in every preset",
  );
  await page.screenshot({ path: `${shots}/pack-${width}.png`, fullPage: true });
  await page.close();
}

/** Tier 2 up to the download: WebGPU is found, the explicit button is offered, clicking it boots the worker. */
async function checkLocalModel() {
  const flags = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan,WebGPU",
    "--use-angle=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--ignore-gpu-blocklist",
  ];
  const gpuBrowser = await launchChrome({ args: flags });
  const page = await open(gpuBrowser, 1280);
  await page.goto(`${base}#try`, { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: /Download a ~1 GB model/ });
  await button.waitFor({ timeout: 10000 });
  expect(true, "tier 2: WebGPU adapter found, download offered only as an explicit button");
  await button.click();
  await page.waitForFunction(
    () =>
      /Fetching|Loading|Initiali|download|failed/i.test(document.querySelector(".status")?.textContent ?? ""),
    null,
    { timeout: 60000 },
  );
  expect(true, `tier 2: worker booted, status: ${await page.locator(".status").textContent()}`);
  await page.screenshot({ path: `${shots}/try-webllm-loading.png` });
  await gpuBrowser.close();
}

/** Tier 2 end to end with a small model on software WebGPU: slow, so it only runs with --webgpu-run. */
async function checkLocalRun() {
  const flags = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan,WebGPU",
    "--use-angle=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--ignore-gpu-blocklist",
  ];
  const gpuBrowser = await launchChrome({ args: flags });
  const page = await open(gpuBrowser, 1280);
  await page.goto(`${base}?webllm-model=Qwen2.5-0.5B-Instruct-q4f16_1-MLC#try`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Download a ~1 GB model/ }).click();
  await page.getByText("The local model is ready.").waitFor({ timeout: 20 * 60000 });
  await page.getByRole("button", { name: "Build" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".try .stream .line-in").length >= 1, null, {
    timeout: 25 * 60000,
  });
  const running = await page.locator(".running").textContent();
  expect(running?.includes("WebLLM") ?? false, `tier 2 end to end: ${running}`);
  console.log(await page.locator(".try .stream").textContent());
  await page.screenshot({ path: `${shots}/try-webllm-run.png` });
  await gpuBrowser.close();
}

const recorded = data.screens.find((s) => s.pack === null && s.screen.components.length >= 4)!;
const mock = `globalThis.LanguageModel = { availability: async () => "available", create: async () => ({ destroy() {}, promptStreaming: () => new ReadableStream({ async start(c) { const t = ${JSON.stringify(JSON.stringify({ lines: recorded.screen.components }))}; for (let i = 0; i < t.length; i += 40) { c.enqueue(t.slice(i, i + 40)); await new Promise((r) => setTimeout(r, 15)); } c.close(); } }) }) };`;

const browser = await launchChrome();
for (const width of [1280, 390]) await checkCreate(browser, width);
await checkTry(browser, 1280, undefined, "Recorded replay");
await checkTry(browser, 390, undefined, "Recorded replay");
await checkTry(browser, 1280, mock, "Chrome built-in AI");
await checkPlayground(browser);
await checkViewAct(browser);
await checkEdges(browser);
await checkTheme(browser);
for (const width of [1280, 390]) await checkPack(browser, width);
await browser.close();
if (process.argv.includes("--webgpu")) await checkLocalModel();
if (process.argv.includes("--webgpu-run")) await checkLocalRun();
if (failures.length) (console.log(failures.join("\n")), (process.exitCode = 1));
