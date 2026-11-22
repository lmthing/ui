import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, expect, it } from "vitest";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
const route = "/box-score-fixture";
const fixture = new URL("./BoxScore.fixture.tsx", import.meta.url).pathname;

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("scrolls to the last stat with the player pinned, switches team, and opens the visible profile", async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "box-score-fixture",
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href, { waitUntil: "commit" });
  const home = page.getByRole("button", { name: "Amara Field", exact: true });
  await home.waitFor({ timeout: 30000 });
  const namesBefore = await home.boundingBox();
  const table = page.getByRole("region", { name: "MIN, PTS, REB, AST, STL, BLK, TO, PF" });
  await table.press("End");
  await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect((await home.boundingBox())?.x).toBe(namesBefore?.x);
  const last = await table.getByText("PF", { exact: true }).boundingBox();
  const viewport = await table.boundingBox();
  expect(last!.x + last!.width).toBeLessThanOrEqual(viewport!.x + viewport!.width + 1);
  const numericRuns = await table
    .getByText("12345678", { exact: true })
    .first()
    .evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
  expect(numericRuns).toBe(1);
  await page.getByRole("radio", { name: "Fern House" }).click();
  const away = page.getByRole("button", { name: "Sam Banks", exact: true });
  await away.waitFor();
  expect(await home.count()).toBe(0);
  await away.press("Enter");
  await expect.poll(() => page.locator("body").getAttribute("data-profile")).toBe("sam_banks");
  expect(errors).toEqual([]);
});
