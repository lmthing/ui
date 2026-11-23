import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, BrowserContext, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size, space, type as typography } from "@lmthing/ui/catalog";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, context: BrowserContext, page: Page;
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
  context = await browser.newContext({ viewport: { width: 390, height: 750 }, reducedMotion: "reduce" });
  await context.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60000);

const recipe = (part: string) => page.getByTestId(`fixture/recipes/${part}`);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const state = (name: string) => page.getByRole("button", { name, exact: true }).click();

beforeEach(async () => {
  errors.length = 0;
  // Reloading the same page across cases can abort Vite's module requests.
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL(path, server.resolvedUrls!.local[0]).href);
  try {
    await recipe("root").waitFor({ timeout: 15000 });
  } catch (error) {
    throw new Error(`Kit fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 40000);

afterEach(async () => {
  await page?.close();
});

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

const base = (part: string) => page.getByTestId(`fixture/base/${part}`);
const edge = (part: string) => page.getByTestId(`fixture/edge/${part}`);

it("aligns an input with its caption and a neighbouring avatar row", async () => {
  const search = page.getByRole("searchbox", { name: "Search caption" });
  const [field, caption, name] = await Promise.all([
    box(search),
    box(page.getByText("Search caption", { exact: true })),
    box(base("name")),
  ]);
  expect(field.x).toBeCloseTo(caption.x);
  expect(field.x).toBeCloseTo(name.x);
  await search.fill("Query");
  expect(await search.inputValue()).toBe("Query");
  const amount = page.getByRole("spinbutton", { name: "Amount" });
  expect(await amount.evaluate((el) => getComputedStyle(el).textAlign)).toBe("right");
  expect(await amount.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toBe("tabular-nums");
  const skeleton = page.getByTestId("control-skeleton").locator(":scope > *");
  expect(await skeleton.evaluate((el) => getComputedStyle(el).borderRadius)).toBe(
    await amount.evaluate((el) => {
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        if (parseFloat(css.borderTopWidth)) return css.borderRadius;
      }
      return null;
    }),
  );
});

it("keeps negative glyphs distinct from neutral actions and gives secondary actions a boundary", async () => {
  const tone = (el: Element) => getComputedStyle(el.querySelector("svg")!).color;
  const border = (el: Element) => getComputedStyle(el).borderTopColor;
  expect(await base("delete").evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
  expect(await base("delete").evaluate(tone)).not.toBe(await base("close").evaluate(tone));
  expect(await base("keep").evaluate(border)).not.toBe("rgba(0, 0, 0, 0)");
  for (const part of ["delete", "close", "keep"]) {
    const target = await box(base(part));
    expect(target.height).toBeGreaterThanOrEqual(size.control.md);
    expect(target.width).toBeGreaterThanOrEqual(size.control.md);
  }
});

it("uses the explicit empty title, then the caller noun, then the cast", async () => {
  await state("empty");
  expect(await base("explicit").textContent()).toBe("No saved entries");
  expect(await base("message").textContent()).toBe("No records yet");
  expect(await base("cast").textContent()).toBe("No entries yet");
  expect(await base("explicit").evaluate((el) => getComputedStyle(el).color)).toBe(
    await base("cast").evaluate((el) => getComputedStyle(el).color),
  );
  expect(await base("prose").textContent()).toBe("This prose keeps its words and punctuation in place.");
  expect(await base("prose").evaluate((el) => getComputedStyle(el).textWrapMode)).toBe("wrap");
  expect(await base("prose").evaluate((el) => getComputedStyle(el).getPropertyValue("text-wrap-style"))).toBe(
    "pretty",
  );
});

it("fits one numeric column beside its pinned rail and draws only one rule before the total", async () => {
  const [card, table, rail, detail, total] = await Promise.all(
    ["root", "table", "r1/root", "r1/cell", "r2/cell"].map((part) => box(edge(part))),
  );
  const stroke = await edge("root").evaluate((el) => {
    const css = getComputedStyle(el);
    return { left: parseFloat(css.borderLeftWidth), bottom: parseFloat(css.borderBottomWidth) };
  });
  expect(table!.x - card!.x).toBe(stroke.left);
  expect(card!.y + card!.height - table!.y - table!.height).toBeCloseTo(stroke.bottom);
  expect(detail!.width).toBeCloseTo(rail!.width);
  expect(total!.y).toBeCloseTo(detail!.y + detail!.height);
  expect(await edge("r1/cell").evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("0px");
  expect(await edge("r2/cell").evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
  expect(await edge("r2/cell").evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("0px");
  for (const row of ["r1", "r2"]) {
    expect(await edge(`${row}/value`).evaluate((el) => getComputedStyle(el).textAlign)).toBe("right");
    expect(await edge(`${row}/value`).evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toBe(
      "tabular-nums",
    );
  }
  expect((await box(edge("r1/root"))).y - table!.y).toBeLessThanOrEqual(size.control.md);
  expect(await edge("r3/adjustment").count()).toBe(1);
  await state("loading");
  expect(await edge("table").getByRole("button").count()).toBe(0);
  expect(await edge("r3/adjustment").count()).toBe(0);
  expect((await box(edge("table"))).height).toBeCloseTo(table!.height, 0);
});

it("draws a non-interactive outline inside the swatch without changing its footprint", async () => {
  const swatch = base("swatch");
  const outline = swatch.locator(":scope > [aria-hidden=true]");
  const before = await box(swatch);
  expect(await box(outline)).toEqual(before);
  expect(await outline.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(await outline.evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(
    await swatch.evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  await state("loading");
  const after = await box(swatch);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
});

it("scales the hour grid with density and keeps a linked block reachable by keyboard", async () => {
  const block = (density: string, row: string) => page.getByTestId(`fixture/${density}/${row}/root`);
  for (const density of ["comfortable", "compact"]) {
    const first = block(density, "r1");
    const [a, b] = await Promise.all([box(first), box(block(density, "r2"))]);
    const hour = density === "compact" ? 48 : 56;
    expect(b.y - a.y).toBe(hour);
    expect(a.height).toBe(hour);
    expect(await first.locator("svg").count()).toBe(1);
    await first.press("Enter");
    expect(await page.getByTestId("pressed").textContent()).toBe(`plan:fixture/${density}/r1/root`);
  }
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
