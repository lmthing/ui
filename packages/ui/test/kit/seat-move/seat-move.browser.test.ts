import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { size } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "../../../scripts/look";

let server: ViteDevServer;
let browser: Browser;
const route = "/seat-move-fixture";
const fixture = new URL("./seat-move.page.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "seat-move-fixture",
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
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("moves a seated guest by keyboard, click and agent without changing the guest address", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const address = "home/c1/r1/root";
    const guest = page.getByTestId(address);
    const moveTo = (table: string) => page.getByRole("button", { name: `Move Ari Shah to ${table}` });
    const activeAddress = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    const read = () => page.evaluate(() => window.__lmthingUI!.read());
    await guest.press("Enter");
    expect(await guest.getAttribute("aria-expanded")).toBe("true");
    expect(await moveTo("Birch").evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press("Escape");
    expect(await guest.getAttribute("aria-expanded")).toBe("false");
    expect(await activeAddress()).toBe(address);
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    expect(await moveTo("Cherry").evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press("Enter");
    expect(await read()).toContain('[c1/r1 move = "Cherry"; choices ["Oak","Birch"]]');
    expect(await guest.count()).toBe(1);
    expect(await activeAddress()).toBe(address);
    await guest.click();
    expect(await moveTo("Cherry").count()).toBe(0);
    await moveTo("Birch").click();
    expect(await read()).toContain('[c1/r1 move = "Birch"; choices ["Oak","Cherry"]]');
    const act = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r1", action: "move", value: "Oak" }),
    );
    expect(act.ok).toBe(true);
    expect(await read()).toContain('[c1/r1 move = "Oak"; choices ["Birch","Cherry"]]');
    expect(await guest.count()).toBe(1);
  } finally {
    await page.close();
  }
});

it("does not steal focus when an agent moves a guest with an open chooser", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const ari = page.getByTestId("home/c1/r1/root");
    const bea = page.getByTestId("home/c1/r2/root");
    const beaFocused = () => bea.evaluate((element) => element === document.activeElement);
    await ari.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await beaFocused()).toBe(true);
    const result = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r1", action: "move", value: "Cherry" }),
    );
    expect(result.ok).toBe(true);
    await page.getByRole("button", { name: "Move Ari Shah to Oak" }).waitFor();
    expect(await beaFocused()).toBe(true);
  } finally {
    await page.close();
  }
});

it("seats a tray guest by keyboard, preserves its address and hides the newly full table", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const guest = page.getByTestId("home/c1/r3/root");
    const next = page.getByTestId("home/c1/r4/root");
    const option = (name: string) => page.getByRole("button", { name, exact: true });
    expect(await guest.textContent()).toBe("Cam Cole");
    await guest.press("Space");
    expect(await option("Move Cam Cole to Birch").evaluate((node) => node === document.activeElement)).toBe(
      true,
    );
    await page.keyboard.press("Enter");
    expect(await guest.textContent()).toBe("CC");
    expect(await guest.count()).toBe(1);
    expect(await guest.evaluate((node) => node === document.activeElement)).toBe(true);
    await next.click();
    expect(await option("Move Dee Park to Birch").count()).toBe(0);
    expect(await option("Move Dee Park to Cherry").count()).toBe(1);
    const act = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r4", action: "move", value: "Birch" }),
    );
    expect(act).toMatchObject({ ok: false, code: "invalid_value" });
    await page.keyboard.press("Enter");
    expect(await next.textContent()).toBe("DP");
    expect(await page.getByTestId("home/c1/tray").count()).toBe(0);
    // The last seat leaves no destination. The new marker can receive restored focus but is not tabbable.
    expect(await next.evaluate((node) => node === document.activeElement)).toBe(true);
    expect(await next.getAttribute("tabindex")).toBe("-1");
  } finally {
    await page.close();
  }
});

it("shows Gantt viewport continuation on the scrollable side without moving the label rail", async () => {
  const page = await browser.newPage({ viewport: { width: 430, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL("/?c=Gantt&w=390&preset=calm&mode=light", server.resolvedUrls!.local[0]).href);
    const chart = page.locator('[data-look-frame] [data-testid$="/chart"]').first();
    const timeline = chart.getByRole("region");
    const cue = (side: "left" | "right") => chart.locator(`[data-viewport-cue="${side}"]`);
    const label = chart.getByText("Plan plants", { exact: true });
    await cue("right").nth(1).waitFor();
    expect(await cue("left").count()).toBe(0);
    expect(await timeline.getAttribute("tabindex")).toBe("0");
    const labelLeft = (await label.boundingBox())!.x;
    await timeline.press("ArrowRight");
    await cue("left").first().waitFor();
    await timeline.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await cue("right").first().waitFor({ state: "detached" });
    expect((await label.boundingBox())!.x).toBe(labelLeft);
    expect(
      await timeline.evaluate((element) => element.scrollWidth - element.clientWidth - element.scrollLeft),
    ).toBeLessThanOrEqual(1);
  } finally {
    await page.close();
  }
});

it("keeps all sixteen round seats separated and reachable in a narrow phone", async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(`${route}?full-round-table`, server.resolvedUrls!.local[0]).href);
    const table = page.getByRole("region", { name: "Oak" });
    await table.waitFor();
    const sizes = await table.locator('[data-testid^="home/c1/r"]').evaluateAll((seats) =>
      seats.map((seat) => {
        const { x, y, width, height } = seat.getBoundingClientRect();
        return { width, height, x: x + width / 2, y: y + height / 2 };
      }),
    );
    expect(sizes).toHaveLength(16);
    for (const [index, a] of sizes.entries()) {
      // DOMRect can subtract two subpixel coordinates when reporting the CSS dimensions.
      expect(a.width).toBeCloseTo(size.control.md, 4);
      expect(a.height).toBeCloseTo(size.control.md, 4);
      const b = sizes[(index + 1) % sizes.length]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(size.control.md);
    }
    await table.press("ArrowRight");
    await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    const farSeat = page.getByTestId("home/c1/r5/root");
    await farSeat.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const viewport = (await table.boundingBox())!;
        const seat = (await farSeat.boundingBox())!;
        return seat.x + seat.width - (viewport.x + viewport.width);
      })
      .toBeLessThanOrEqual(1);
  } finally {
    await page.close();
  }
});
