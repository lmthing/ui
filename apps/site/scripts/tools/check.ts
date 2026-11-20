// tsx scripts/tools/check.ts <baseUrl> <shotsDir> [--webgpu] [--webgpu-run]: drives the built site in headless
// Chromium and asserts the live parts work (create stream, playground, packs, try-it replay, a mocked tier 1
// and a mocked OpenRouter).
import { launchChrome } from "../../../../packages/ui/scripts/look/launch-chrome";
import { checkLocalModel, checkLocalRun } from "./check-local";
import { checkOpenRouter } from "./check-openrouter";
import {
  base,
  data as siteData,
  expect,
  failures,
  open,
  recordedData,
  shots,
  type Browser,
} from "./check-lib";

async function checkCreate(browser: Browser, width: number) {
  const page = await open(browser, width);
  await page.goto(base, { waitUntil: "networkidle" });
  const caption = page.locator(".demo-code .caption span").last();
  const seen = new Set<string | null>();
  for (let i = 0; i < 8; i++) {
    seen.add(await caption.textContent());
    await page.waitForTimeout(700);
  }
  expect(seen.size > 1, `create stream changes over time at ${width}px (${seen.size} distinct states)`);
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
  await page.goto(`${base}#try`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Read and act" }).click();
  await page.getByRole("button", { name: /Show the answer/ }).click();
  await page.waitForSelector(".addr-hit", { timeout: 10000 });
  expect(true, "view and act: the recorded answer's part is highlighted on the phone");
  await page.screenshot({ path: `${shots}/viewact-1280.png` });
  await page.close();
}

async function checkTheme(browser: Browser) {
  const page = await open(browser, 390);
  await page.goto(`${base}`, { waitUntil: "networkidle" });
  const before = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg"),
  );
  await page.getByRole("button", { name: /Theme:/ }).click();
  await page.getByLabel("dark").check({ force: true });
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

/** A tab open across a deploy asks for a chunk that is gone: reload once, then show the chrome and a Reload button. */
async function checkStaleChunk(browser: Browser) {
  const page = await open(browser, 1280, undefined, /Failed to fetch dynamically imported module/);
  let loads = 0;
  // Count document requests, not load events: the chunk fails before the first load event, so the reload
  // replaces that navigation and only one load event fires.
  page.on("request", (request) => {
    if (request.resourceType() === "document") loads += 1;
  });
  await page.route(/ComponentPage-[^/]*\.js/, (route) => route.abort());
  await page.goto(`${base}#/c/Amount`);
  await page.getByRole("button", { name: "Reload" }).waitFor({ timeout: 15000 });
  expect(
    (await page.getByRole("link", { name: /lmthing\/ui, home/ }).count()) > 0,
    "stale chunk: the header is still there",
  );
  expect(loads === 2, `stale chunk: reloaded exactly once (${loads} loads)`);
  await page.screenshot({ path: `${shots}/reload-1280.png` });
  await page.close();
}

async function checkIndex(browser: Browser) {
  const page = await open(browser, 1280);
  await page.goto(`${base}#/components`, { waitUntil: "networkidle" });
  const all = await page.locator(".specimen").count();
  await page.getByRole("radiogroup", { name: "Pack" }).getByRole("radio", { name: "booking" }).click();
  const some = await page.locator(".specimen").count();
  expect(some > 0 && some < all, `index: pack filter narrows ${all} to ${some}`);
  await page.screenshot({ path: `${shots}/index-filter-1280.png` });
  await page.close();
}

/** A link to a section must land on it, from a cold load: the section's top is just under the header. */
async function checkAnchors(browser: Browser) {
  for (const id of ["try", "packs", "components"]) {
    const page = await open(browser, 1280);
    await page.goto(`${base}#${id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const top = await page.evaluate(
      (target) => document.getElementById(target)?.getBoundingClientRect().top ?? 9999,
      id,
    );
    expect(top > -40 && top < 200, `anchor #${id} lands near the top (section top at ${Math.round(top)} px)`);
    await page.close();
  }
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
    (await page.locator(".showcase .phone").count()) === siteData.presets.length,
    "pack page: worked example in every preset",
  );
  await page.screenshot({ path: `${shots}/pack-${width}.png`, fullPage: true });
  await page.close();
}

const recorded = recordedData.screens.find((s) => s.pack === null && s.screen.components.length >= 4)!;
const mock = `globalThis.LanguageModel = { availability: async () => "available", create: async () => ({ destroy() {}, promptStreaming: () => new ReadableStream({ async start(c) { const t = ${JSON.stringify(JSON.stringify({ lines: recorded.screen.components }))}; for (let i = 0; i < t.length; i += 40) { c.enqueue(t.slice(i, i + 40)); await new Promise((r) => setTimeout(r, 15)); } c.close(); } }) }) };`;

const browser = await launchChrome();
for (const width of [1280, 390]) await checkCreate(browser, width);
await checkTry(browser, 1280, undefined, "Recorded replay");
await checkTry(browser, 390, undefined, "Recorded replay");
await checkTry(browser, 1280, mock, "Chrome built-in AI");
await checkOpenRouter(browser);
await checkPlayground(browser);
await checkViewAct(browser);
await checkStaleChunk(browser);
await checkIndex(browser);
await checkAnchors(browser);
await checkEdges(browser);
await checkTheme(browser);
for (const width of [1280, 390]) await checkPack(browser, width);
await browser.close();
if (process.argv.includes("--webgpu")) await checkLocalModel();
if (process.argv.includes("--webgpu-run")) await checkLocalRun();
if (failures.length) (console.log(failures.join("\n")), (process.exitCode = 1));
