import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/media-options-test";
const fixture = new URL("./media-options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "media-options-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 750 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByTestId("media/saved/r1/root").waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("can reach the end of the horizontal shelf and open the last cover", async () => {
  const first = page.getByTestId("media/saved/r1/root");
  const last = page.getByTestId("media/saved/r3/root");
  expect((await last.boundingBox())!.x + (await last.boundingBox())!.width).toBeGreaterThan(390);
  await first.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await last.evaluate((node) => document.activeElement === node)).toBe(true);
  await last.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const box = (await last.boundingBox())!;
      return Math.round(box.x + box.width);
    })
    .toBeLessThanOrEqual(390);
  await last.click();
  await expect.poll(() => page.locator("output").textContent()).toBe("media/saved/r3 press");
});

it("activates the separate upcoming download and book playback controls", async () => {
  const download = page.getByRole("button", { name: "Download After the rain" });
  await page.getByText("Up next", { exact: true }).waitFor();
  await download.click();
  await expect.poll(() => page.locator("output").textContent()).toBe("media/queue/r2/trail press");
  await page.getByRole("button", { name: "Play audiobook" }).click();
  await expect.poll(() => page.locator("output").textContent()).toBe("media/book/play press");
});
