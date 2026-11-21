import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/play-runtime-fixture";
const fixture = new URL("./play.page.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "play-runtime-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60000);

beforeEach(async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const control = (part: string) => page.getByTestId(`play/${part}`);
const read = () => page.evaluate(() => window.__lmthingUI!.read());
const act = (address: string, action: string) =>
  page.evaluate(({ address, action }) => window.__lmthingUI!.act({ address, action }), { address, action });

it("rotates only selected pads without changing reading, address or keyboard order", async () => {
  const north = page.getByTestId("play/counters/r1/root");
  const east = page.getByTestId("play/counters/r2/root");
  const south = page.getByTestId("play/counters/r3/root");
  const cellTransform = (el: HTMLElement | SVGElement) => {
    for (
      let parent = el.parentElement;
      parent && parent.dataset.testid !== "play/counters/root";
      parent = parent.parentElement
    ) {
      const transform = getComputedStyle(parent).transform;
      if (transform !== "none") return transform;
    }
    return "none";
  };
  expect(await north.evaluate((el) => getComputedStyle(el).transform)).toBe("matrix(-1, 0, 0, -1, 0, 0)");
  expect(await east.evaluate(cellTransform)).toBe("matrix(-1, 0, 0, -1, 0, 0)");
  expect(await south.evaluate(cellTransform)).toBe("none");
  const reading = await read();
  expect(reading.match(/r\d "(\w+)"/g)).toEqual(['r1 "North"', 'r2 "East"', 'r3 "South"']);
  const lastNorth = control("counters/r1/minus_2");
  await lastNorth.focus();
  await page.keyboard.press("Tab");
  expect(await control("counters/r2/life").evaluate((el) => el === document.activeElement)).toBe(true);
});

it("shares bounds between buttons and restores only starting counter values on confirmed reset", async () => {
  const into = (index: number) => `counters/r1/plus_${index}`;
  const plus = control(into(1));
  const minus = control("counters/r1/minus_1");
  const life = control("counters/r1/life");
  const reset = control("counters/reset");
  expect(await read()).not.toContain("[counters/r1/minus_1");
  await plus.click();
  await expect.poll(() => read()).toContain("[counters/r1/minus_1 decrement = 4]");
  await plus.click();
  await expect.poll(() => plus.getAttribute("aria-disabled")).toBe("true");
  expect(await read()).not.toContain("[counters/r1/plus_1");
  expect(await read()).toContain("[counters/r1/minus_2 decrement = 8]");
  expect(await read()).toContain("[counters/r2/plus_1 increment = 0]");
  await life.click();
  await reset.click();
  expect(await read()).toContain("confirm/confirm");
  expect((await act("confirm/cancel", "dismiss")).ok).toBe(true);
  expect(await read()).toContain("[counters/r1/minus_1 decrement = 6]");
  expect(await life.innerText()).toBe("8");
  await minus.click();
  await expect.poll(() => read()).toContain("[counters/r1/plus_1 increment = 3]");
  await reset.click();
  expect((await act("confirm/confirm", "press")).ok).toBe(true);
  await expect.poll(() => life.innerText()).toBe("7");
  expect(await read()).toContain("[counters/r1/plus_1 increment = 1]");
  expect(await read()).not.toContain("[counters/r1/minus_1");
  expect(await read()).toContain("First");
});

it("veils on release outside, pointer cancellation, keyup and keyboard cancellation", async () => {
  const target = control("handoff/show");
  const secret = control("handoff/secret");
  const name = control("handoff/name");
  const hold = async () => {
    await target.hover();
    await page.mouse.down();
  };
  await hold();
  await expect.poll(() => secret.textContent()).toBe("Private alpha");
  expect(await read()).not.toMatch(/Private|Second/);
  expect((await act("counters/reset", "press")).ok).toBe(true);
  expect(await read()).toContain("confirm/cancel");
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect.poll(() => secret.count()).toBe(0);
  expect(await read()).toContain("confirm/cancel");
  expect((await act("confirm/cancel", "dismiss")).ok).toBe(true);
  await expect.poll(() => name.textContent()).toBe("Second");
  await hold();
  await expect.poll(() => secret.textContent()).toBe("Private beta");
  await target.evaluate((element) => {
    element.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }));
  });
  await expect.poll(() => name.textContent()).toBe("Third");
  await page.mouse.up();
  await target.focus();
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await expect.poll(() => secret.textContent()).toBe("Private gamma");
  await page.keyboard.up("Space");
  await expect.poll(() => name.textContent()).toBe("Fourth");
  await page.keyboard.down("Enter");
  await expect.poll(() => secret.textContent()).toBe("Private delta");
  expect(await read()).not.toMatch(/Private|RevealFixture \(success\)/);
  await page.keyboard.press("Escape");
  await page.keyboard.up("Enter");
  await expect.poll(() => secret.count()).toBe(0);
  expect(await read()).toContain("handoff RevealFixture (success)");
});
