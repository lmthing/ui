import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/transcript-test";
const fixture = new URL("./transcript.fixture.tsx", import.meta.url).pathname;
const part = (name: string) => page.getByTestId(`transcript/${name}`);
const seekReport = () => page.locator("output").textContent();
const tick = (at: number) =>
  page.evaluate((detail) => window.dispatchEvent(new CustomEvent("test-playhead", { detail })), at);

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "transcript-fixture",
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
  await part("t1/r1/root").waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("seeks on a line tap, follows the live playhead, and saves without seeking", async () => {
  const region = page.getByRole("region", { name: "Transcript", exact: true });
  const top = () => region.evaluate((node) => node.scrollTop);
  const current = (line: number) => part(`t1/r${line}/root`).getAttribute("aria-current");
  const settle = { timeout: 10000 };
  await part("t1/r2/root").click();
  await expect.poll(seekReport).toBe("2");
  await expect.poll(() => current(2)).toBe("true");
  await tick(78);
  await expect.poll(() => current(40), settle).toBe("true");
  await expect
    .poll(() => region.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop), settle)
    .toBeLessThan(30);
  const scrolled = await top();
  expect(scrolled).toBeGreaterThan(0);
  const follow = page.getByRole("switch", { name: "Follow playback" });
  await follow.click();
  await tick(0);
  await expect.poll(() => current(1), settle).toBe("true");
  expect(await top()).toBe(scrolled);
  await follow.click();
  await expect
    .poll(async () => {
      const first = (await part("t1/r1/root").boundingBox())!;
      const viewport = (await region.boundingBox())!;
      return first.y >= viewport.y - 1 && first.y + first.height <= viewport.y + viewport.height;
    })
    .toBe(true);
  const save = part("t1/r1/save");
  await save.click();
  await expect.poll(() => save.getAttribute("aria-label")).toBe("Saved to Highlights: Timed line 1");
  expect(await seekReport()).toBe("2");
});
