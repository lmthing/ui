import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/wave-six-media-test";
const fixture = new URL("./media.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "wave-six-media-fixture",
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
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await page.getByRole("button", { name: "Play first clip" }).waitFor({ timeout: 20000 });
  } catch (error) {
    throw new Error(`Media fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("attaches a clip to its addressed row, switches via the keyboard, and unmounts on agent stop", async () => {
  await page.getByRole("button", { name: "Play first clip" }).click();
  await page.getByTestId("first_clip").waitFor({ state: "attached" });
  expect(await page.getByText("Clip 1 preview").count()).toBe(0);
  expect(await page.getByText("Clip 2 preview").count()).toBe(1);
  await page.getByRole("button", { name: "Play second clip" }).press("Enter");
  await page.getByTestId("second_clip").waitFor({ state: "attached" });
  expect(await page.getByTestId("first_clip").count()).toBe(0);
  expect(await page.getByText("Clip 1 preview").count()).toBe(1);
  expect(
    await page.evaluate(() => window.__lmthingUI?.act({ address: "clips/r2/clip", action: "stop" }).ok),
  ).toBe(true);
  await page.getByTestId("second_clip").waitFor({ state: "detached" });
  expect(await page.getByText("Clip 2 preview").count()).toBe(1);
});

it("lands on the same discrete cursor from pointer, keyboard, and agent", async () => {
  await page.getByRole("button", { name: "Seek to frame 2" }).press("Space");
  await expect.poll(() => page.locator("output").textContent()).toBe("Frame 2");
  await page.getByRole("button", { name: "Seek to frame 1" }).click();
  await expect.poll(() => page.locator("output").textContent()).toBe("Frame 1");
  expect(await page.evaluate(() => window.__lmthingUI?.act({ address: "clips/r2", action: "seek" }).ok)).toBe(
    true,
  );
  await expect.poll(() => page.locator("output").textContent()).toBe("Frame 2");
  expect(await page.evaluate(() => window.__lmthingUI?.read())).toContain(
    "[clips/position seek = 1; range 0..1]",
  );
});

it("keeps the active video mounted when the overlay changes", async () => {
  await page.getByRole("button", { name: "Play first clip" }).click();
  const video = page.getByTestId("first_clip");
  await video.waitFor({ state: "attached" });
  const overlay = page.getByRole("button", { name: "Toggle playback overlay" });
  await overlay.click();
  const toolbar = page.getByText("Overlay", { exact: true });
  await toolbar.waitFor();
  expect(await toolbar.locator("../..").locator(":scope > div > video").count()).toBe(1);
  await overlay.click();
  await toolbar.waitFor({ state: "detached" });
  await video.waitFor({ state: "attached" });
});
