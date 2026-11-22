import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-scroll-follow-test";
const fixture = new URL("./scroll-follow.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-scroll-follow-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 750 }, reducedMotion: "reduce" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const region = () => page.getByRole("region", { name: "Addressed rows" });
const button = (name: string) => page.getByRole("button", { name, exact: true });
const row = (number: number) => page.getByTestId(`home/c1/r${number}/root`);
const update = async (number: number) => {
  await button(`Show ${number}`).dispatchEvent("click");
  await expect.poll(() => page.locator("output").textContent()).toBe(String(number));
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
};
const offset = () => region().evaluate((node) => node.scrollTop);
const edge = async (number: number, side: "top" | "bottom" | "right") =>
  (await row(number).evaluate((node, side) => node.getBoundingClientRect()[side], side)) -
  (await region().evaluate((node, side) => node.getBoundingClientRect()[side], side));
async function open(horizontal = false) {
  await page.goto(new URL(`${route}${horizontal ? "?horizontal" : ""}`, server.resolvedUrls!.local[0]).href);
  await row(1).waitFor();
}

it("reveals active rows at the nearest edge without focusing them, including consecutive updates", async () => {
  await open();
  await button("Keep focus here").focus();
  await update(14);
  expect(await edge(14, "bottom")).toBeCloseTo(0, 0);
  await update(16);
  expect(await edge(16, "bottom")).toBeCloseTo(0, 0);
  await update(2);
  expect(await edge(2, "top")).toBeCloseTo(0, 0);
  const top = await offset();
  await update(21);
  expect(await offset()).toBe(top);
  expect(await button("Keep focus here").evaluate((node) => node === document.activeElement)).toBe(true);
});

it("does not scroll when follow is off and does not replay updates skipped during wheel scrolling", async () => {
  await open();
  await button("Follow").dispatchEvent("click");
  await update(14);
  expect(await offset()).toBe(0);
  await button("Follow").dispatchEvent("click");
  await expect.poll(() => edge(14, "bottom")).toBeCloseTo(0, 0);
  const beforeWheel = await offset();
  await region().hover();
  await page.mouse.wheel(0, -90);
  await expect.poll(offset).toBeLessThan(beforeWheel);
  const manual = await offset();
  await update(18);
  expect(await offset()).toBe(manual);
  await page.waitForTimeout(300);
  expect(await offset()).toBe(manual);
  await update(19);
  expect(await edge(19, "bottom")).toBeCloseTo(0, 0);
});

it("reveals the horizontal edge without moving the page or the other axis", async () => {
  await open(true);
  await update(14);
  expect(await edge(14, "right")).toBeCloseTo(0, 0);
  expect(await offset()).toBe(0);
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
});

it("stops an ongoing smooth reveal if the new active row is already visible", async () => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    await open();
    await update(19);
    await expect.poll(offset, { intervals: [10] }).toBeGreaterThan(0);
    await update(2);
    const stopped = await offset();
    expect(stopped).toBeGreaterThan(0);
    expect(await edge(2, "top")).toBeGreaterThanOrEqual(0);
    await page.waitForTimeout(500);
    expect(await offset()).toBe(stopped);
  } finally {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
});
