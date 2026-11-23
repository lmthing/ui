import { fileURLToPath, URL } from "node:url";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../scripts/look";

const fixture = fileURLToPath(new URL("./data-view.fixture.tsx", import.meta.url));
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "data-view-test",
        configureServer(vite) {
          vite.middlewares.use("/data-view-test", (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<meta name="viewport" content="width=device-width, initial-scale=1"><body><script type="module" src="/@fs${fixture}"></script></body>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
}, 60000);
afterEach(async () => {
  await page?.close();
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function open(example: string) {
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name ??= (fn) => fn");
  await page.goto(`${server.resolvedUrls!.local[0]}data-view-test?example=${example}`);
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

it("switches Segmented panels by keyboard, reads the empty option and returns to the original addresses", async () => {
  await open("dashboard");
  const summary = page.getByTestId("walk_dashboard/summary/r1/label");
  const goal = page.getByText("Weekly walk goal", { exact: true });
  const results = page.getByTestId("walk_dashboard/view/results");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await summary.waitFor();
  await expect.poll(() => goal.count()).toBe(0);
  await page.keyboard.press("ArrowRight");
  await goal.waitFor();
  expect(await tabs.nth(1).getAttribute("aria-selected")).toBe("true");
  expect(await summary.count()).toBe(0);
  await page.keyboard.press("End");
  await results.waitFor();
  expect(await results.textContent()).toBe("No walks logged last week");
  expect(await goal.count()).toBe(0);
  await page.keyboard.press("Home");
  await summary.waitFor();
  expect(await results.count()).toBe(0);
  expect(await tabs.first().getAttribute("aria-selected")).toBe("true");
});

it("scrolls many Chips on one line and filters by keyboard, including empty and restored rows", async () => {
  await open("list");
  const chips = page.getByRole("checkbox");
  const fern = page.getByTestId("plant_list/plants/r1/title");
  const basil = page.getByTestId("plant_list/plants/r2/title");
  const results = page.getByTestId("plant_list/plants/results");
  await fern.waitFor();
  expect(await chips.count()).toBe(6);
  const geometry = await chips.evaluateAll((nodes) => {
    const track = nodes[0]!.parentElement!;
    const scroll = track.parentElement!.parentElement!;
    return {
      tops: nodes.map((node) => node.getBoundingClientRect().top),
      overflowing: scroll.scrollWidth > scroll.clientWidth,
    };
  });
  expect(new Set(geometry.tops).size).toBe(1);
  expect(geometry.overflowing).toBe(true);
  const lastChipFits = () =>
    chips.last().evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const viewport = node.parentElement!.parentElement!.parentElement!.getBoundingClientRect();
      return bounds.left >= viewport.left && bounds.right <= viewport.right;
    });
  await chips.first().hover();
  await page.mouse.wheel(400, 0);
  await expect.poll(lastChipFits).toBe(true);
  await chips.first().press("Space");
  await fern.waitFor({ state: "detached" });
  expect(await basil.textContent()).toBe("Basil");
  await chips.first().press("Space");
  await fern.waitFor();
  await chips.last().focus();
  await expect.poll(lastChipFits).toBe(true);
  await page.keyboard.press("Enter");
  await results.waitFor();
  expect(await results.textContent()).toBe("No plants in the bedroom");
  expect(await basil.count()).toBe(0);
  await page.keyboard.press("Enter");
  await basil.waitFor();
  expect(await results.count()).toBe(0);
});

it("filters the named browse shelf without changing the independent care-plan shelf", async () => {
  await open("browse");
  const inInventory = page.getByTestId("browse_plants/inventory/r2/title");
  const inCare = page.getByTestId("browse_plants/care/r2/title");
  await inInventory.waitFor();
  await page.getByRole("checkbox", { name: "Kitchen" }).click();
  await inInventory.waitFor({ state: "detached" });
  expect(await inCare.textContent()).toBe("Fern");
});

it("updates the visible and readable message for a List already in the empty state", async () => {
  await open("empty");
  const message = page.getByTestId("plant_list/plants/results");
  await message.waitFor();
  expect(await message.textContent()).toBe("No plants in the kitchen");
  await page.getByRole("checkbox", { name: "Bathroom" }).click();
  await expect.poll(() => message.textContent()).toBe("No plants in the bathroom");
  expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain(
    'plants List (empty) "No plants in the bathroom"',
  );
});
