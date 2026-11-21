import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-tile-buzz-test";
const fixture = new URL("./KitTile.buzz.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-tile-buzz-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:390px"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByTestId("test/pads/r1/buzz").waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("records the named pad on pointer down and leaves an ordinary tile on root press", async () => {
  const first = page.getByRole("button", { name: "First" });
  expect(await first.getAttribute("data-testid")).toBe("test/pads/r1/buzz");
  expect(await page.getByTestId("test/pads/r1/root").count()).toBe(0);
  await first.hover();
  await page.evaluate(() => window.tileBuzz.setTime(10));
  await page.mouse.down();
  const round = () => page.evaluate(() => window.tileBuzz.round());
  expect(await round()).toEqual({ winner: "r1", deltas: { r1: 0 } });
  await page.evaluate(() => window.tileBuzz.setTime(80));
  await page.mouse.up();
  await page.getByRole("button", { name: "Second" }).press("Enter");
  expect(await round()).toEqual({ winner: "r1", deltas: { r1: 0, r2: 70 } });
  const ordinary = page.getByRole("button", { name: "Ordinary" });
  expect(await ordinary.getAttribute("data-testid")).toBe("test/pads/r5/root");
  await ordinary.click();
  expect(await page.evaluate(() => window.tileBuzz.events.map((step) => step.address))).toEqual([
    "test/pads/r1/buzz",
    "test/pads/r2/buzz",
    "test/pads/r5",
  ]);
  await page.getByRole("button", { name: "Reset" }).click();
  expect(await round()).toBeUndefined();
  await first.dispatchEvent("click", { detail: 0 });
  expect(await round()).toEqual({ winner: "r1", deltas: { r1: 0 } });
});

it("keeps disabled and loading timed targets inert for both pointers and controller dispatch", async () => {
  const count = () => page.evaluate(() => window.tileBuzz.events.length);
  const before = await count();
  for (const item of ["r3", "r4"]) {
    const address = `test/pads/${item}/buzz`;
    await page.getByTestId(address).dispatchEvent("pointerdown", { button: 0 });
    expect(
      await page.evaluate((address) => window.tileBuzz.act({ address, action: "press" }), address),
    ).toMatchObject({ ok: false, code: "disabled" });
  }
  expect(await count()).toBe(before);
});
