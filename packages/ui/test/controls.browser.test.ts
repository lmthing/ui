import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    `globalThis.__name = (fn) => fn; globalThis.links = []; globalThis.sends = []; globalThis.changes = []; addEventListener("gallery-link", (event) => links.push(event.detail)); addEventListener("gallery-send", (event) => sends.push(event.detail)); addEventListener("gallery-change", (event) => changes.push(event.detail));`,
  );
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
const part = (address: string) => page.getByTestId(`controls/${address}`);
async function open(kind: string) {
  errors.length = 0;
  await page.goto(`${server.resolvedUrls!.local[0]}?controls=${kind}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

it("keeps a wrapping record title, both facts, and the deadline visible at phone width", async () => {
  await page.goto(`${server.resolvedUrls!.local[0]}?c=List&w=390&preset=calm&mode=light`);
  const frame = page.locator("[data-look-frame]").filter({ hasText: "WHEN WE BUILD WITH HARD WOOD" });
  const title = frame.getByText("WHEN WE BUILD WITH HARD WOOD", { exact: true });
  await title.waitFor();
  await page.evaluate(() => document.fonts.ready);
  const lines = await title.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return Array.from(range.getClientRects(), ({ right, top }) => ({ right, top }));
  });
  expect(new Set(lines.map(({ top }) => top)).size).toBeGreaterThan(1);
  const bounds = (await frame.boundingBox())!;
  expect(Math.max(...lines.map(({ right }) => right))).toBeLessThan(bounds.x + bounds.width);
  for (const fact of [
    "Second edition, reference copy",
    "West reading room · upper shelf",
    "Available after Thursday",
  ])
    expect(await frame.getByText(fact, { exact: true }).isVisible()).toBe(true);
  expect(await frame.getByRole("link").count()).toBe(1);
});

it("paints the List monogram without adding row text or an accessible name", async () => {
  await page.goto(`${server.resolvedUrls!.local[0]}?c=List&w=390&preset=calm&mode=light`);
  const title = "WHEN WE BUILD WITH HARD WOOD";
  const facts = [
    "Second edition, reference copy",
    "West reading room · upper shelf",
    "Available after Thursday",
  ];
  const row = page.getByRole("link", { name: [title, ...facts].join(" "), exact: true });
  await row.waitFor();
  const tile = row.locator('[data-testid$="/icon"]');
  expect(await tile.getAttribute("aria-hidden")).toBe("true");
  expect(await tile.textContent()).toBe("");
  const initial = tile.locator("[data-kit-photo-initial]");
  expect(await initial.isVisible()).toBe(true);
  expect(await initial.evaluate((node) => getComputedStyle(node, "::before").content)).toBe('"W"');
  expect(await row.textContent()).toBe([title, ...facts].join(""));
});

describe("human and agent control paths", () => {
  it("selects and toggles real options", async () => {
    await open("choice");
    await part("c1/r2/root").click();
    expect(await part("c1/r2/root").getAttribute("aria-checked")).toBe("true");
    expect(await part("c1/r1/root").getAttribute("aria-checked")).toBe("false");
    await page.evaluate(() => window.__lmthingUI!.act({ address: "c1/r1", action: "select" }));
    expect(await part("c1/r1/root").getAttribute("aria-checked")).toBe("true");
    await open("multi");
    await part("c1/r1/root").click();
    await part("c1/r2/root").click();
    expect(await part("c1/r1/root").getAttribute("aria-checked")).toBe("true");
    expect(await part("c1/r2/root").getAttribute("aria-checked")).toBe("true");
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("toggle:on");
    expect(errors).toEqual([]);
  });
  it("edits and clears fields, chooses recurrence, switches and adjusts a slider", async () => {
    await open("form");
    await part("f1/field").fill("Basil");
    expect(await part("f1/field").inputValue()).toBe("Basil");
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain('"Basil"');
    await part("f1/field").fill("");
    expect(await part("f1/field").inputValue()).toBe("");
    await part("f2/field").getByRole("radio", { name: "Weekly", exact: true }).click();
    await page.waitForFunction(() => window.__lmthingUI!.read().includes("Weekly chosen"));
    await part("f3/field").click();
    expect(await part("f3/field").getAttribute("aria-checked")).toBe("true");
    await part("f4/field").focus();
    await page.keyboard.press("ArrowRight");
    expect(await part("f4/field").getAttribute("aria-valuenow")).toBe("6");
    await part("f5/field").fill("-");
    expect(await part("f5/field").inputValue()).toBe("-");
    await part("f5/field").fill("14");
    expect(await part("f5/field").inputValue()).toBe("14");
    await part("f6/field").fill("2026-12-01");
    await part("f7/field").fill("10:30");
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("2026-12-01");
    expect(await page.evaluate("changes.length")).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});

describe("human and agent control paths", () => {
  it("blocks empty replies, sends typed content and clears the box", async () => {
    await open("chat");
    expect(await part("c1/send").getAttribute("aria-disabled")).toBe("true");
    await part("c1/field").fill("Thanks, see you at nine.");
    expect(await part("c1/send").getAttribute("aria-disabled")).not.toBe("true");
    await part("c1/send").click();
    await page.waitForFunction("sends.length === 1");
    expect(await page.evaluate("sends[0].text")).toBe("Thanks, see you at nine.");
    expect(await part("c1/field").inputValue()).toBe("");
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Thanks, see you at nine.");
    expect(errors).toEqual([]);
  });
  it("checks tasks and expands rows without navigating when a switch is pressed", async () => {
    await open("lists");
    await part("q1/r1/check").click();
    expect(await part("q1/r1/check").getAttribute("aria-checked")).toBe("true");
    expect(await part("l1/r1/root").getAttribute("aria-expanded")).toBe("false");
    await part("l1/r1/root").click();
    expect(await part("l1/r1/root").getAttribute("aria-expanded")).toBe("true");
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Check the soil first.");
    await part("l1/r1/root").click();
    expect(await page.evaluate(() => window.__lmthingUI!.read())).not.toContain("Check the soil first.");
    await part("l2/r1/trail").click();
    expect(await page.evaluate("links.length")).toBe(0);
    expect(await part("l2/r1/trail").getAttribute("aria-checked")).toBe("true");
    expect(await part("l1/r1/trail").count()).toBe(0);
    await part("l2/r1/root").click();
    expect(await page.evaluate("links.map(({ goto }) => goto)")).toEqual(["care"]);
    expect(errors).toEqual([]);
  });
  it("uses counter steps, runs and pauses time, and selects a level", async () => {
    await open("numbers");
    expect(await part("c1/minus").getAttribute("aria-disabled")).toBe("true");
    await part("c1/plus").click();
    expect(await part("c1/value").textContent()).toBe("5");
    await part("c1/minus").click();
    expect(await part("c1/value").textContent()).toBe("2");
    await part("s1/l5").click();
    expect(await part("s1/l5").getAttribute("aria-checked")).toBe("true");
    await part("t1/start").click();
    await page.waitForFunction(() => window.__lmthingUI!.read().includes("0:01"));
    await part("t1/stop").click();
    const paused = await part("t1/time").textContent();
    await page.waitForTimeout(1200);
    expect(await part("t1/time").textContent()).toBe(paused);
    expect(errors).toEqual([]);
  });
});

describe("human and agent control paths", () => {
  it("selects filters, views, dates and linked tabs with count badges", async () => {
    await open("navigation");
    await part("s1/r2/root").click();
    expect(await part("s1/r2/root").getAttribute("aria-selected")).toBe("true");
    await part("f1/r2/root").click();
    expect(await part("f1/r2/root").getAttribute("aria-checked")).toBe("true");
    expect(await part("t1/r2/badge").textContent()).toBe("99+");
    expect(await part("t1/r1/root").getAttribute("aria-selected")).toBe("true");
    await part("t1/r2/root").click();
    await page.waitForFunction("links.length === 1");
    expect(await page.evaluate("links[0].goto")).toBe("inbox");
    await expect.poll(() => part("t1/r2/root").getAttribute("aria-selected")).toBe("true");
    expect(await part("t1/r1/root").getAttribute("aria-selected")).toBe("false");
    expect(await part("f1/r2/root").getAttribute("aria-checked")).toBe("true");
    const result = await page.evaluate(() => window.__lmthingUI!.act({ address: "t1/r1", action: "select" }));
    expect(result.ok).toBe(true);
    await page.waitForFunction("links.length === 2");
    expect(await page.evaluate("links[1].goto")).toBe("home");
    await expect.poll(() => part("t1/r1/root").getAttribute("aria-selected")).toBe("true");
    await open("calendar");
    await part("c1/r12/root").click();
    expect(await part("c1/r12/root").getAttribute("aria-pressed")).toBe("true");
    expect(errors).toEqual([]);
  });
  it("swipes cards by pointer and keyboard while preserving item ids", async () => {
    await open("swipe");
    const box = await part("s1/r1/root").boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    await part("s1/r2/root").waitFor();
    await part("s1/r2/root").focus();
    await page.keyboard.press("ArrowLeft");
    await part("s1/r3/root").waitFor();
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("Monstera");
    expect(errors).toEqual([]);
  });
  it("requests a host photo and updates its referenced image", async () => {
    await open("photo");
    await part("f1/field").click();
    await page.waitForFunction(
      "changes.some((change) => change.values['controls/f1/field'] === 'lib:plants')",
    );
    expect(await part("f1/photo").getAttribute("role")).toBe("img");
    expect(await part("f1/photo").getAttribute("aria-label")).toBe("Plant photo");
    expect(errors).toEqual([]);
  });
});
