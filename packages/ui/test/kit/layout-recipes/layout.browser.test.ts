import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const path = "/kit-layout-recipes";
const file = new URL("./layout.fixture.tsx", import.meta.url).pathname;
const errors: string[] = [];

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-layout-fixture",
        configureServer({ middlewares }) {
          middlewares.use(path, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><style>body{margin:0}</style><div id="root"></div><script type="module" src="/@fs${file}"></script>`,
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
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);

const recipe = (part: string) => page.getByTestId(`fixture/recipes/${part}`);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const state = (name: string) => page.getByRole("button", { name, exact: true }).click();

beforeEach(async () => {
  errors.length = 0;
  await page.goto(new URL(path, server.resolvedUrls!.local[0]).href);
  try {
    await recipe("root").waitFor({ timeout: 15000 });
  } catch (error) {
    throw new Error(`Kit fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 40000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("shares a rail, leaves no placeholder for absent metadata and keeps the loading footprint", async () => {
  const card = recipe("root");
  const item = (index: number) => card.locator('[role="listitem"]').nth(index);
  expect((await box(recipe("r1/title"))).x).toBe((await box(recipe("r2/title"))).x);
  expect(await recipe("r2/meta").count()).toBe(0);
  const first = await box(item(0)),
    second = await box(item(1));
  expect(first.height).toBeGreaterThan(second.height);
  const filled = await box(card);
  await state("loading");
  expect(await recipe("save").count()).toBe(0);
  expect(await card.getByRole("button").count()).toBe(0);
  expect(await recipe("r1/title").count()).toBe(0);
  expect((await box(card)).height).toBeCloseTo(filled.height);
  expect((await box(item(0))).height).toBeCloseTo(first.height);
  expect((await box(item(1))).height).toBeCloseTo(second.height);
});

it("uses neutral empty copy and retains the same rows on error and success", async () => {
  const edges = await box(recipe("r1/title"));
  await state("error");
  expect(await recipe("root").getByRole("alert").textContent()).toBe("Something went wrong");
  expect(await recipe("root").getByRole("button", { name: "Try again" }).count()).toBe(0);
  expect((await box(recipe("r1/title"))).x).toBe(edges.x);
  await state("success");
  expect(await recipe("root").getByRole("status").textContent()).toBe("Saved");
  expect((await box(recipe("r1/title"))).x).toBe(edges.x);
  await state("empty");
  expect(await recipe("notice").textContent()).toBe("Nothing here yet");
  expect(await recipe("r1/title").count()).toBe(0);
  expect(errors).toEqual([]);
});

it("reaches the last wide-table column by keyboard, keeping the leading rail pinned", async () => {
  const table = page.getByTestId("fixture/matrix/table");
  const heading = page.getByTestId("fixture/matrix/r1/heading");
  const last = page.getByTestId("fixture/matrix/r1/extra");
  for (const fitted of [true, false]) {
    if (!fitted) await state("Toggle fit");
    const scroller = table.getByRole("region");
    await scroller.waitFor();
    const left = (await box(heading)).x;
    await scroller.press("End");
    await expect
      .poll(async () => {
        const cell = await box(last),
          view = await box(scroller);
        return cell.x >= view.x && cell.x + cell.width <= view.x + view.width + 1;
      })
      .toBe(true);
    expect((await box(last)).width).toBeGreaterThanOrEqual(size.control.md);
    expect((await box(heading)).x).toBe(left);
    await last.focus();
    expect(await last.evaluate((element) => element === document.activeElement)).toBe(true);
  }
});
