import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../../../../scripts/look";
import { launchChrome } from "../../../../scripts";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-variants-test";
const fixture = new URL("./variants.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-variants-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:320px"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ reducedMotion: "no-preference" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await page.getByTestId("preview/strip/second").waitFor({ state: "attached", timeout: 12000 });
  } catch (error) {
    throw new Error(`Variant fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("responds to changes in the browser's reduced-motion setting", async () => {
  await page.waitForFunction(() => document.querySelector("output")?.textContent === "lively");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("output")?.textContent === "calm");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector("output")?.textContent === "lively");
});

it("snaps to the second and last strip pages rather than settling between cells", async () => {
  const strip = page.locator(".is_ScrollView");
  await page.waitForFunction(() => {
    const scroller = document.querySelector(".is_ScrollView");
    return !!scroller && scroller.scrollWidth > scroller.clientWidth * 2;
  });
  for (const part of ["second", "third"]) {
    const cell = page.getByTestId(`preview/strip/${part}`);
    const offset = (await cell.boundingBox())!.x - (await strip.boundingBox())!.x;
    await strip.evaluate((node, delta) => node.scrollBy({ left: delta - 24, behavior: "instant" }), offset);
    await expect
      .poll(async () => {
        return Math.round((await cell.boundingBox())!.x - (await strip.boundingBox())!.x);
      })
      .toBe(0);
  }
});

it("keeps an addressed shelf cover full width above its title and trail", async () => {
  const part = (name: string) => page.getByTestId(`preview/shelf/r1/${name}`).boundingBox();
  const [row, cover, title, trail] = await Promise.all(["root", "icon", "title", "trail"].map(part));
  expect(cover!.width).toBeCloseTo(row!.width, 0);
  expect(title!.y).toBeGreaterThanOrEqual(cover!.y + cover!.height);
  expect(trail!.x).toBeGreaterThan(title!.x);
  expect(trail!.y + trail!.height / 2).toBeCloseTo(title!.y + title!.height / 2, 0);
});
