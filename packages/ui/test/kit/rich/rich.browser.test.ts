import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/rich-kit-test";
const fixture = new URL("./rich.fixture.tsx", import.meta.url).pathname;
const errors: string[] = [];

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "rich-kit-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><style>body{margin:0}</style><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 760 }, reducedMotion: "reduce" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);

beforeEach(async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await button("Copy").waitFor({ timeout: 30000 });
  } catch (error) {
    throw new Error(`Rich fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 40000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const button = (name: string) => page.getByRole("button", { name, exact: true });
const box = async (locator: Locator) => (await locator.boundingBox())!;
const panel = (i: number) => page.getByTestId(`home/panels/r${i}/root`);
const reader = () => page.getByRole("region", { name: "Panel reader" });
const viewportOffset = (axis: "scrollLeft" | "scrollTop") =>
  reader().evaluate((node, key) => node[key], axis);

it("keeps the exact selectable source, wraps without losing whitespace, and copies through the runtime", async () => {
  const text = page.locator("code");
  const original = await text.textContent();
  expect(original).toBe(
    `  const label = "<em>literal</em>";\n\n\t// trailing whitespace  \n${"long_identifier_".repeat(14)}\n${"漢".repeat(42)}\n`,
  );
  expect(await text.locator("em").count()).toBe(0);
  expect(await text.locator("span").count()).toBeGreaterThan(0);
  expect(await text.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre");
  const scroller = text.locator("..").locator("..");
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await button("Copy").press("Enter", { timeout: 4000 });
  await button("Copied").waitFor({ timeout: 4000 });
  expect(await page.locator("#clipboard").textContent()).toBe(original);
  await button("Wrap").click();
  expect(await text.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");
  expect((await box(text)).width).toBeLessThan(390);
  expect(await text.textContent()).toBe(original);
  const filled = await box(page.getByRole("group", { name: "Example" }));
  await button("Loading").click();
  const loading = page.getByRole("group", { name: "Loading" });
  expect((await box(loading)).height).toBe(filled.height);
  expect(await loading.getByText(/long_identifier/).isVisible()).toBe(false);
  expect(await loading.ariaSnapshot()).not.toContain("long_identifier");
  await button("Loading").click();
  await button("Block copy").click();
  expect(await button("Copy").getAttribute("aria-disabled")).toBe("true");
  await button("Loading").click();
  await button("Loading").click();
  expect(await button("Copy").getAttribute("aria-disabled")).toBe("true");
  await button("Unblock copy").click();
  expect(await button("Copy").getAttribute("aria-disabled")).toBe(null);
  await button("Change code").click();
  await button("Copy").click();
  await button("Copied").waitFor();
  expect(await page.locator("#clipboard").textContent()).toBe("1 + 1 = 2");
  for (const state of ["Loading", "Empty"]) {
    await button(state).click();
    expect(await text.count()).toBe(0);
    expect((await button("Copied").count()) + (await button("Copy").count())).toBe(0);
    await button("Attempt copy").click();
    expect(await page.locator("#attempted").textContent()).toBe("false");
    await button(state).click();
    await button("Copy").press("Space", { timeout: 4000 });
    await button("Copied").waitFor({ timeout: 4000 });
  }
});

it("stacks unequal ratios in two columns without changing list order, and retains loading geometry", async () => {
  const masonry = page.getByTestId("home/tiles/root");
  const tiles = masonry.getByRole("listitem");
  await expect.poll(() => tiles.count()).toBe(4);
  expect(await tiles.allTextContents()).toEqual(["Tile 1", "Tile 2", "Tile 3", "Tile 4"]);
  const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map((i) => box(tiles.nth(i))));
  expect(a!.y).toBe(b!.y);
  expect(a!.width).toBe(b!.width);
  expect(a!.width / a!.height).toBeCloseTo(0.75);
  expect(b!.width / b!.height).toBeCloseTo(2);
  expect(c!.x).toBe(b!.x);
  expect(c!.y - (b!.y + b!.height)).toBeCloseTo(b!.x - a!.width);
  expect(d!.x).toBe(a!.x);
  const height = (await box(masonry)).height;
  await button("Loading").click();
  expect(await masonry.getAttribute("aria-busy")).toBe("true");
  expect(await tiles.count()).toBe(0);
  expect((await box(masonry)).height).toBeCloseTo(height);
  await button("Loading").click();
  await button("Single").click();
  expect(await tiles.count()).toBe(1);
  expect((await box(tiles.first())).width).toBe(a!.width);
  await button("Empty").click();
  expect(await masonry.textContent()).toBe("Nothing here yet");
});

it("scrolls gaplessly, snaps in both directions, and works with the HUD hidden", async () => {
  await panel(3).waitFor();
  const first = await box(panel(1).locator("..").locator(".."));
  const second = await box(panel(2).locator("..").locator(".."));
  expect(second.y).toBeCloseTo(first.y + first.height);
  await reader().evaluate((el) => el.scrollTo({ top: 400 }));
  await expect.poll(() => viewportOffset("scrollTop")).toBe(400);
  await button("ltr").click();
  await button("Jump").click();
  await expect.poll(() => viewportOffset("scrollLeft")).toBe(780);
  await reader().press("Home");
  await reader().press("ArrowRight");
  await expect.poll(() => viewportOffset("scrollLeft")).toBe(390);
  await button("rtl").click();
  expect(await reader().evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  expect(await reader().evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe("x mandatory");
  await reader().press("Home");
  await reader().press("ArrowLeft");
  await expect.poll(() => viewportOffset("scrollLeft")).toBe(-390);
  await reader().press("Home");
  const hud = button("Toggle reader controls");
  await hud.press("Space");
  expect(await page.getByText("Reader HUD").count()).toBe(0);
  const zoom = await page.context().newCDPSession(page);
  await zoom.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  try {
    expect(await page.evaluate(() => visualViewport?.scale)).toBe(2);
    await reader().press("ArrowLeft");
    await expect.poll(() => viewportOffset("scrollLeft")).toBe(-390);
    expect(await page.getByText("Reader HUD").count()).toBe(0);
  } finally {
    await zoom.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    await zoom.detach();
  }
  await reader().press("Home");
  await panel(1).click();
  expect(await page.getByText("Reader HUD").count()).toBe(1);
  await button("Change target").click();
  expect(await hud.count()).toBe(0);
  await reader().press("ArrowLeft");
  await expect.poll(() => viewportOffset("scrollLeft")).toBe(-390);
  await button("Change target").click();
  await button("Loading").click();
  expect(await hud.count()).toBe(0);
  expect(await page.getByText("Panel 1", { exact: true }).count()).toBe(0);
  await button("Loading").click();
  await button("Empty").click();
  expect(await page.getByTestId("home/panels/root").textContent()).toBe("Nothing here yet");
});

it("makes one tall page keyboard-scrollable and disables a shared root HUD address while hidden", async () => {
  await button("Single").click();
  await button("ltr").click();
  const tall = reader().getByRole("listitem");
  expect(await tall.getAttribute("tabindex")).toBe("0");
  await tall.press("End");
  await expect.poll(() => tall.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await button("Root target").click();
  await button("Attempt HUD").click();
  expect(await page.locator("#attempted").textContent()).toBe("true");
  for (const state of ["Loading", "Empty"]) {
    await button(state).click();
    await button("Attempt HUD").click();
    expect(await page.locator("#attempted").textContent()).toBe("false");
    await button(state).click();
    const hud = button("Toggle reader controls");
    expect(await hud.getAttribute("aria-disabled")).toBe(null);
  }
});
