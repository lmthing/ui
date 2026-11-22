import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size, space, type as typography } from "@lmthing/ui/catalog";
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
  const narrow = card.getByTestId("narrow-slot");
  const wrapped = (await box(narrow)).height;
  expect(wrapped).toBeGreaterThan(typography.body.lineHeight);
  await state("loading");
  expect(await card.getByRole("progressbar", { name: "Loading" }).count()).toBe(1);
  expect(await recipe("save").count()).toBe(0);
  expect(await card.getByRole("button").count()).toBe(0);
  expect(await recipe("r1/title").count()).toBe(0);
  expect((await box(card)).height).toBeCloseTo(filled.height);
  expect((await box(item(0))).height).toBeCloseTo(first.height);
  expect((await box(item(1))).height).toBeCloseTo(second.height);
  expect((await box(narrow)).height).toBeCloseTo(wrapped);
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

it("reserves separate touch slots for inline links without changing their order or address", async () => {
  const link = (part: string) => page.getByTestId(`fixture/links/${part}`);
  const first = link("r1/root"),
    second = link("r2/root"),
    long = link("r3/root");
  const [a, b, c, paragraph, before, after] = await Promise.all([
    box(first),
    box(second),
    box(long),
    box(link("paragraph")),
    box(link("before")),
    box(link("after")),
  ]);
  expect(await link("paragraph").textContent()).toBe("Read it next before you go.");
  for (const target of [a, b, c]) {
    expect(target.width).toBeGreaterThanOrEqual(size.control.md);
    expect(target.height).toBeGreaterThanOrEqual(size.control.md);
    expect(target.x).toBeGreaterThanOrEqual(paragraph.x);
    expect(target.x + target.width).toBeLessThanOrEqual(paragraph.x + paragraph.width + 1);
  }
  expect(before.x + before.width).toBeLessThanOrEqual(a.x);
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
  expect(b.x + b.width).toBeLessThanOrEqual(after.x);
  expect(await first.getAttribute("role")).toBe("link");
  await first.click({ position: { x: 2, y: 2 } });
  expect(await page.getByTestId("pressed").textContent()).toBe("first:fixture/links/r1/root");
  await first.press("Tab");
  expect(await second.evaluate((node) => node === document.activeElement)).toBe(true);
  await second.press("Enter");
  expect(await page.getByTestId("pressed").textContent()).toBe("second:fixture/links/r2/root");
  await state("loading");
  expect(await first.count()).toBe(0);
  expect(await second.count()).toBe(0);
});

it("reserves the filled Article paragraph geometry without links during loading", async () => {
  const article = (index: number) => page.getByTestId(`fixture/article_${index}/root`);
  const articles = [article(0), article(1)];
  const sizes = await Promise.all(articles.map(box));
  for (const card of articles) {
    expect(await card.getByRole("link").count()).toBe(1);
    expect(await card.locator('[data-testid$="/r1/root"]').count()).toBe(1);
  }
  await state("loading");
  for (const [index, card] of articles.entries()) {
    expect(await card.getByRole("link").count()).toBe(0);
    expect(await card.locator('[data-testid$="/r1/root"]').count()).toBe(0);
    expect((await box(card)).height).toBeCloseTo(sizes[index]!.height, 0);
  }
});

it("rests on whole lane pages and reaches the last lane by keyboard", async () => {
  const lanes = page.getByTestId("fixture/columns/lanes");
  const rail = lanes.getByRole("region");
  const lane = (index: number) => page.getByTestId(`fixture/columns/lane_${index}`);
  const view = await box(rail);
  await expect.poll(async () => (await box(lane(0))).width).toBeCloseTo(view.width);
  expect((await box(lane(1))).x).toBeCloseTo(view.x + view.width);
  await rail.press("ArrowRight");
  await expect.poll(async () => (await box(lane(1))).x).toBeCloseTo(view.x);
  await rail.press("End");
  await expect.poll(async () => (await box(lane(2))).x).toBeCloseTo(view.x);
  await rail.press("Home");
  await expect.poll(async () => (await box(lane(0))).x).toBeCloseTo(view.x);
  await expect.poll(() => rail.evaluate((node) => getComputedStyle(node).scrollbarWidth)).not.toBe("none");
  await rail.hover();
  await page.mouse.wheel(view.width * 2, 0);
  await expect.poll(async () => (await box(lane(2))).x).toBeCloseTo(view.x);
  await state("loading");
  expect(await lane(0).count()).toBe(0);
  expect(await rail.getAttribute("tabindex")).toBe("-1");
});

it("balances segment widths and separates neutral decrement from positive increment", async () => {
  const track = page.getByTestId("fixture/controls/track");
  const tabs = track.getByRole("tab");
  expect((await box(tabs.nth(0))).width).toBeCloseTo((await box(tabs.nth(1))).width);
  const stepper = page.getByTestId("fixture/controls/quantity");
  const [minus, plus] = await stepper.getByRole("button").all();
  const [a, b, value] = await Promise.all([box(minus!), box(plus!), box(stepper.getByText("2"))]);
  expect(value.x - (a.x + a.width)).toBe(space.sm);
  expect(b.x - (value.x + value.width)).toBe(space.sm);
  for (const target of [a, b]) expect(target.width).toBeGreaterThanOrEqual(size.control.md);
  const background = (node: Element) => getComputedStyle(node).backgroundColor;
  expect(await minus!.evaluate(background)).not.toBe(await plus!.evaluate(background));
});

it("gives compact and long weekday cells room for their actual contents", async () => {
  const week = (part: string) => page.getByTestId(`fixture/week/${part}`);
  const rail = week("table").getByRole("region");
  const [mon, tue, wed] = await Promise.all([box(week("r1/mon")), box(week("r1/tue")), box(week("r1/wed"))]);
  expect(mon.width).toBeGreaterThanOrEqual(size.control.md);
  expect(tue.width).toBeGreaterThan(mon.width);
  expect(wed.width).toBe(mon.width);
  expect(await week("r1/shift").evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await rail.press("End");
  const [view, sunday] = await Promise.all([box(rail), box(week("r1/sun"))]);
  expect(sunday.x + sunday.width).toBeLessThanOrEqual(view.x + view.width + 1);
  expect(sunday.x).toBeGreaterThanOrEqual(view.x);
});

it("centres seat grids and aligns the exit mark on the row-label centreline", async () => {
  const root = page.getByTestId("fixture/drawings/seat_grid");
  const grid = root.getByRole("grid");
  const heading = grid.getByRole("rowheader", { name: "01, Exit" });
  const [frame, seats, label, mark] = await Promise.all([
    box(root),
    box(grid),
    box(heading.getByText("01")),
    box(heading.locator("svg")),
  ]);
  expect(seats.x - frame.x).toBeCloseTo(frame.x + frame.width - (seats.x + seats.width));
  expect(label.y + label.height / 2).toBeCloseTo(mark.y + mark.height / 2, 0);
  await state("loading");
  expect(await grid.count()).toBe(0);
  expect(await root.getByRole("gridcell").count()).toBe(0);
  expect((await box(root)).width).toBe(frame.width);
});

it("keeps the next gallery caption outside the resting page and fully reachable by scrolling", async () => {
  const carousel = page.getByTestId("legacy-carousel");
  const rail = carousel.locator(".is_ScrollView");
  const second = page.getByTestId("fixture/drawings/second_page");
  await rail.scrollIntoViewIfNeeded();
  const frame = await box(rail);
  await expect
    .poll(() => rail.evaluate((node) => node.scrollWidth - node.clientWidth))
    .toBeGreaterThanOrEqual(frame.width);
  const resting = await box(second);
  expect(resting.x).toBeGreaterThanOrEqual(frame.x + frame.width);
  await rail.evaluate((node, left) => node.scrollBy({ left, behavior: "instant" }), resting.x - frame.x - 24);
  await expect.poll(async () => (await box(second)).x).toBeCloseTo(frame.x, 0);
  expect((await box(second)).width).toBeLessThanOrEqual(frame.width);
});

it("draws loading route lines to different text widths and keeps an inert link-trail slot", async () => {
  const stop = page.getByTestId("fixture/drawings/r3/root");
  const filled = await box(stop);
  const trail = await box(stop.locator(":scope > *").last());
  await state("loading");
  expect(await stop.count()).toBe(0);
  const loading = page.getByTestId("fixture/drawings/root").locator('[aria-busy="true"]').last();
  const slot = loading.locator(":scope > *").last();
  expect((await box(slot)).width).toBe(trail.width);
  expect(await slot.locator("svg").count()).toBe(0);
  expect((await box(slot.locator(":scope > *"))).width).toBe(space.sm);
  const bars = await loading.locator(":scope > :nth-child(2) > *").all();
  expect((await box(bars[0]!)).width).toBeGreaterThan((await box(bars[1]!)).width);
  expect((await box(loading)).width).toBe(filled.width);
});
