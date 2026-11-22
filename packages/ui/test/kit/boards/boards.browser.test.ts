import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-boards-test";
const fixture = new URL("./boards.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-boards-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><div id="root"></div><script type="module" src="/@fs${fixture}"></script></body>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
}, 60000);

beforeEach(async () => {
  await page?.close();
  page = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await page.getByRole("grid", { name: "Front" }).waitFor({ timeout: 12000 });
  } catch (error) {
    throw new Error(`Boards did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 25000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const active = () => page.locator(":focus").getAttribute("aria-label");
const presses = () => page.evaluate(() => window.boardPresses);

it("KitSeatGrid aligns aisle gaps, reads taken seats, and moves or activates by keyboard and touch", async () => {
  const grid = page.getByRole("grid", { name: "Front" });
  expect(await grid.getAttribute("aria-colcount")).toBe("17");
  expect(await grid.getByRole("rowheader").allTextContents()).toEqual(["A", "B"]);
  const seat = (name: string) => grid.getByRole("gridcell", { name, exact: true });
  expect(await seat("Not a seat").count()).toBe(0);
  expect(await seat("A2").getAttribute("aria-disabled")).toBe("true");
  expect(await seat("A15").getAttribute("aria-selected")).toBe("true");
  expect(await seat("A3").getAttribute("data-testid")).toBeNull();
  expect((await seat("A2").boundingBox())?.x).toBe((await seat("B3").boundingBox())?.x);
  expect((await seat("A1").boundingBox())?.width).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Compact" }).focus();
  await page.keyboard.press("Tab");
  expect(await active()).toBe("A1");
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await page.keyboard.press("ArrowRight");
  expect(await active()).toBe("A2");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  expect(await active()).toBe("B3");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("End");
  expect(await active()).toBe("A15");
  const farSeat = (await seat("A15").boundingBox())!;
  expect(farSeat.x).toBeGreaterThanOrEqual(0);
  expect(farSeat.x + farSeat.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Space");
  await seat("A15").tap();
  expect(await presses()).toEqual([
    { address: "test/seats/r1/root", ok: true },
    { address: "test/seats/r3/root", ok: true },
    { address: "test/seats/r3/root", ok: true },
  ]);
  expect(await grid.locator('[tabindex="0"]').count()).toBe(1);
  await page.keyboard.press("Tab");
  expect(await active()).toBe("C1");
});

it("KitCellGrid draws scored states, clues and notes and reaches every coordinate", async () => {
  const grid = page.getByTestId("test/cells/board").getByRole("grid");
  expect(await grid.getByRole("row").count()).toBe(9);
  expect(await grid.getByRole("gridcell").count()).toBe(81);
  const colors = await grid
    .getByRole("gridcell")
    .evaluateAll((nodes) => nodes.slice(0, 6).map((node) => getComputedStyle(node).backgroundColor));
  expect(new Set(colors.slice(1)).size).toBe(5);
  for (const name of ["correct", "present", "absent", "conflict"]) {
    expect(
      await grid
        .getByRole("gridcell", { name: new RegExp(name) })
        .locator("svg")
        .count(),
    ).toBe(1);
  }
  const given = grid.getByRole("gridcell", { name: "1, 1, given, G" });
  expect(await given.getAttribute("aria-disabled")).toBe("true");
  const notes = page.getByTestId("test/cells/r2/root");
  expect(await notes.getAttribute("aria-label")).toBe("1, 2, draft, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9");
  expect(await notes.getByText("9", { exact: true }).count()).toBe(1);
  const conflict = page.getByTestId("test/cells/r3/root");
  expect(await conflict.getAttribute("aria-invalid")).toBe("true");
  expect(await conflict.getAttribute("aria-selected")).toBe("true");
  expect(await conflict.getByText("0", { exact: true }).count()).toBe(0);

  await given.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+End");
  expect(await active()).toBe("9, 9, empty");
  await page.keyboard.press("Space");
  await page.keyboard.press("Control+Home");
  expect(await active()).toBe("1, 1, given, G");
  expect(await presses()).toEqual([
    { address: "test/cells/r2/root", ok: true },
    { address: "test/cells/r4/root", ok: true },
  ]);
  await page.keyboard.press("Control+End");
  const compact = page.getByRole("button", { name: "Compact" });
  await compact.evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(active).toBe("1, 1, given, G");
  expect(await grid.getByRole("gridcell").count()).toBe(16);
  await page.keyboard.press("ArrowRight");
  expect(await active()).toContain("1, 2, draft");
  await page.getByRole("button", { name: "Filled" }).click();
  await expect.poll(() => page.locator(":focus").textContent()).toBe("Filled");
});

it("retains the same geometry during loading and removes addresses, labels and tab stops", async () => {
  const seatGrid = page.getByTestId("test/seats/map");
  const cellGrid = page.getByTestId("test/cells/board");
  const heights = async () =>
    Promise.all([seatGrid, cellGrid].map(async (grid) => (await grid.boundingBox())?.height));
  const filled = await heights();
  await page.getByRole("button", { name: "Loading" }).click();
  expect(await heights()).toEqual(filled);
  for (const root of [seatGrid, cellGrid]) {
    expect(await root.getAttribute("aria-busy")).toBe("true");
    expect(await root.getByRole("grid").count()).toBe(0);
    expect(await root.locator('[tabindex="0"], [data-testid]').count()).toBe(0);
    expect((await root.textContent())?.trim()).toBe("");
  }
  await page.getByRole("button", { name: "Empty" }).click();
  expect(await seatGrid.getByRole("grid").count()).toBe(0);
  expect(await cellGrid.getByRole("gridcell").count()).toBe(81);
  expect(await cellGrid.getByRole("gridcell", { name: "1, 1", exact: true }).count()).toBe(1);
  expect(await page.getByTestId("test/cells/r2/root").count()).toBe(0);
});

it("reads class, exit, axis and reveal marks without turning unavailable cells into controls", async () => {
  await page.getByRole("button", { name: "Marked" }).click();
  const seats = page.getByRole("grid", { name: "Front" });
  const premium = seats.getByRole("gridcell", { name: "A2, Premium" });
  expect(await premium.locator("svg").count()).toBe(1);
  expect(await premium.getAttribute("aria-disabled")).toBe("true");
  expect(await seats.getByRole("rowheader", { name: "A, Exit row" }).locator("svg").count()).toBe(1);
  const grid = page.getByTestId("test/cells/board").getByRole("grid");
  expect(await grid.getAttribute("aria-rowcount")).toBe("10");
  expect(await grid.getAttribute("aria-colcount")).toBe("10");
  expect(await grid.getByRole("columnheader", { name: "2 1" }).getAttribute("aria-colindex")).toBe("2");
  expect(await grid.getByRole("rowheader", { name: "2 1" }).count()).toBe(1);
  expect(await grid.getByRole("gridcell", { name: "1, 7, correct, Flagged" }).locator("svg").count()).toBe(2);
  await grid.getByRole("gridcell", { name: /1, 2, draft/ }).focus();
  await page.keyboard.press("ArrowRight");
  expect(await active()).toBe("1, 3, blocked");
  const blocked = grid.getByRole("gridcell", { name: "1, 3, blocked" });
  expect(await blocked.getAttribute("aria-disabled")).toBe("true");
  expect(await blocked.getAttribute("data-testid")).toBeNull();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await blocked.tap({ force: true });
  expect(await presses()).toEqual([]);
  await page.keyboard.press("ArrowRight");
  expect(await active()).toBe("1, 4, present, P");
});
