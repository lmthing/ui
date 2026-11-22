import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/range-slider-fixture";
const fixture = new URL("./RangeSlider.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "range-slider-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 750 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByRole("slider").first().waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it.each([
  ["At start", "maximum", "minimum", 1, "0"],
  ["At end", "minimum", "maximum", -1, "10"],
] as const)(
  "drags the movable thumb from coincident endpoints at %s",
  async (label, move, fixed, direction, seed) => {
    const moving = page.getByRole("slider", { name: `${label}, ${move}` });
    const still = page.getByRole("slider", { name: `${label}, ${fixed}` });
    const box = (await moving.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + direction * 120, y, { steps: 4 });
    await page.mouse.up();
    expect(await moving.getAttribute("aria-valuenow")).not.toBe(seed);
    expect(await still.getAttribute("aria-valuenow")).toBe(seed);
    await still.press(direction > 0 ? "End" : "Home");
    expect(await still.getAttribute("aria-valuenow")).toBe(await moving.getAttribute("aria-valuenow"));
  },
);

it("opens the linked share legend row with a keyboard and leaves a plain row static", async () => {
  await page.getByRole("button", { name: /^Park/ }).press("Enter");
  expect(await page.title()).toBe("park");
  expect(await page.getByRole("button", { name: /^River/ }).count()).toBe(0);
});
