import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../scripts";
import { galleryConfig } from "../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/wave-six-test";
const fixture = new URL("./WaveSix.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "wave-six-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByRole("button", { name: "Copy text", exact: true }).waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("copies exact text via the browser and returns to the normal button when a new write fails", async () => {
  await page.getByRole("button", { name: "Copy text", exact: true }).click();
  const copied = page.getByRole("button", { name: "Copied", exact: true });
  await copied.waitFor();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Fixture\n copy");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("fixture rejection"));
  });
  await copied.click();
  await page.getByRole("button", { name: "Copy text", exact: true }).waitFor();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Fixture\n copy");
});

it("renders the portrait, edge markers and overlays at calm light 390", async () => {
  const photo = (await page.getByTestId("home/c1/portrait").boundingBox())!;
  expect(photo.width / photo.height).toBeCloseTo(3 / 4);
  const map = (await page.getByTestId("home/c1/map").boundingBox())!;
  for (const label of ["$1.2K", "CD"]) {
    const mark = (await page.getByText(label, { exact: true }).boundingBox())!;
    expect(mark.x).toBeGreaterThanOrEqual(map.x);
    expect(mark.y).toBeGreaterThanOrEqual(map.y);
    expect(mark.x + mark.width).toBeLessThanOrEqual(map.x + map.width);
    expect(mark.y + mark.height).toBeLessThanOrEqual(map.y + map.height);
  }
  const plot = page.getByTestId("home/c1/plot");
  expect(await plot.locator('path[d$=" Z"]').count()).toBe(1);
  const lines = await plot
    .locator("line")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("y1")));
  expect(lines).toHaveLength(4);
  expect(lines.at(-1)).toBe(lines[1]);
});
