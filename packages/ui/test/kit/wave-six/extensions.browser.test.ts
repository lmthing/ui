import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const path = "/wave-six-extensions";
const fixture = new URL("./extensions.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "wave-six-extensions",
        configureServer({ middlewares }) {
          middlewares.use(path, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><div id="root"></div><script type="module" src="/@fs${fixture}"></script></body>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60_000);

beforeEach(async () => {
  await page.goto(new URL(path, server.resolvedUrls!.local[0]).href);
  await page.getByRole("button", { name: "Now", exact: true }).waitFor({ timeout: 20_000 });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const button = (name: string) => page.getByRole("button", { name, exact: true });
const scrollPosition = () => page.getByRole("region").evaluate((region) => region.scrollLeft);

it("gives a spanned program one target and keeps its channel pinned through human and agent jumps", async () => {
  const program = button("Weather bulletin");
  const rail = page.getByText("Weather", { exact: true });
  expect(await program.count()).toBe(1);
  expect((await program.boundingBox())!.width).toBe(2 * 3 * size.control.md);
  const initial = (await rail.boundingBox())!.x;
  await button("Now").click();
  expect(await page.evaluate(() => window.extensionController.store.get("home/guide/now/$jump"))).toBe(1);
  await expect.poll(scrollPosition).toBeGreaterThan(0);
  expect(await page.locator(":focus").textContent()).toBe("5:00");
  expect((await rail.boundingBox())!.x).toBe(initial);
  await page.getByRole("region").evaluate((node) => {
    node.scrollLeft = 0;
  });
  expect(
    await page.evaluate(() => window.extensionController.act({ address: "guide/now", action: "press" }).ok),
  ).toBe(true);
  expect(await page.evaluate(() => window.extensionController.store.get("home/guide/now/$jump"))).toBe(2);
  await expect.poll(scrollPosition).toBeGreaterThan(0);
  await program.press("Enter");
  expect(await page.evaluate(() => window.extensionEvents)).toContain("home/guide/r1 press");
  await button("Loading").click();
  expect(await program.count()).toBe(0);
  expect(await page.getByTestId("home/guide/r1/root").count()).toBe(0);
});

it("keeps both image rectangles aligned while pointer, keyboard and agent update the clip", async () => {
  const frame = page.getByTestId("home/photo/root");
  const slider = page.getByRole("slider", { name: "Comparison split" });
  const before = frame.locator('img[src$="#before"]');
  const after = frame.locator('img[src$="#after"]');
  await before.waitFor({ state: "attached" });
  const box = (await frame.boundingBox())!;
  expect((await before.boundingBox())!.width).toBeCloseTo(box.width);
  expect((await after.boundingBox())!.width).toBeCloseTo(box.width);
  await slider.press("End");
  expect(await slider.getAttribute("aria-valuenow")).toBe("100");
  await slider.press("Home");
  expect(await slider.getAttribute("aria-valuenow")).toBe("0");
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  await page.mouse.up();
  expect(await slider.getAttribute("aria-valuenow")).toBe("75");
  expect(
    await page.evaluate(
      () => window.extensionController.act({ address: "photo/split", action: "set", value: 30 }).ok,
    ),
  ).toBe(true);
  await expect.poll(() => slider.getAttribute("aria-valuenow")).toBe("30");
  const clip = frame.locator(":scope > div").filter({ has: page.locator('img[src$="#before"]') });
  expect((await clip.boundingBox())!.width).toBeCloseTo(box.width * 0.3, 0);
  expect(await clip.evaluate((node) => getComputedStyle(node).overflow)).toBe("hidden");
  await button("Missing photo").click();
  expect(await slider.isDisabled()).toBe(true);
  await slider.press("End");
  expect(await slider.getAttribute("aria-valuenow")).toBe("30");
  await button("Loading").click();
  expect(await slider.count()).toBe(0);
  expect((await frame.boundingBox())!.height).toBe(box.height);
});

it("swaps the host radar frame without moving its marker or adding another address", async () => {
  const map = page.getByTestId("home/radar/map");
  const pin = page.getByTestId("home/radar/r1/pin");
  await map.locator('img[src$="#first"]').waitFor({ state: "attached" });
  const origin = () =>
    pin.evaluate((element) => {
      const pin = element.getBoundingClientRect();
      const bounds = element.parentElement!.getBoundingClientRect();
      return { left: pin.left - bounds.left, top: pin.top - bounds.top };
    });
  const bounds = await origin();
  await button("Next frame").click();
  await map.locator('img[src$="#next"]').waitFor({ state: "attached" });
  expect(await origin()).toEqual(bounds);
  expect(await map.locator("[data-testid]").count()).toBe(1);
  await button("Loading").click();
  expect(await map.locator("img").count()).toBe(0);
  expect(await pin.count()).toBe(0);
});

it("uses the same date gates for mounted day buttons and agent selection", async () => {
  const range = page.getByLabel("Selected range");
  expect(await button("April 2").isDisabled()).toBe(true);
  await button("April 1").click();
  expect(await range.textContent()).toBe("2026-04-01");
  expect(await button("April 4").isDisabled()).toBe(true);
  const selectFromAgent = (address: string) =>
    page.evaluate((address) => window.extensionController.act({ address, action: "select" }).ok, address);
  expect(await selectFromAgent("dates/r4")).toBe(false);
  await button("Clear dates").click();
  await button("April 3").click();
  expect(await button("April 4").isDisabled()).toBe(true);
  expect(await selectFromAgent("dates/r5")).toBe(true);
  expect(await range.textContent()).toBe("2026-04-03 to 2026-04-05");
  await button("Clear dates").click();
  expect(await range.textContent()).toBe("");
});
