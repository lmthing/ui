import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";
import { interval } from "./story-data";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/story-base-test";
const fixture = new URL("./story.fixture.tsx", import.meta.url).pathname;
const next = () => page.getByRole("button", { name: "Next", exact: true });
const status = () => page.locator('[aria-live="polite"]');
const slide = () => page.locator("output").textContent();
const tick = (ms: number) => page.evaluate((ms) => window.storyTick(ms), ms);

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "story-base-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 750 }, reducedMotion: "reduce" });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60000);

beforeEach(async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await expect.poll(() => status().textContent({ timeout: 1000 })).toBe("Playing");
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function segmentWidths() {
  return page
    .getByTestId("home/story/track")
    .evaluate((el) =>
      Array.from(el.children, (bar) => [
        bar.getBoundingClientRect().width,
        bar.firstElementChild?.getBoundingClientRect().width ?? 0,
      ]),
    );
}

it("freezes elapsed progress on press, resumes on long release, and advances only once on a short tap", async () => {
  const initial = await segmentWidths();
  expect(initial).toHaveLength(3);
  const [[first, fill], [second], [third]] = initial as [
    [number, number],
    [number, number],
    [number, number],
  ];
  expect(first).toBeCloseTo(second, 1);
  expect(second).toBeCloseTo(third, 1);
  expect(fill / first).toBeCloseTo(0.5);
  await next().hover();
  await page.mouse.down();
  await expect.poll(() => status().textContent()).toBe("Paused");
  await tick(interval * 2);
  expect(await slide()).toBe("1");
  expect(await segmentWidths()).toEqual(initial);
  await page.waitForTimeout(260);
  await page.mouse.up();
  await expect.poll(() => status().textContent()).toBe("Playing");
  expect(await slide()).toBe("1");
  await tick(interval / 2 - 1);
  expect(await slide()).toBe("1");
  await tick(1);
  await expect.poll(slide).toBe("2");
  expect(await segmentWidths()).toEqual([
    [first, first],
    [second, 0],
    [third, 0],
  ]);
  await next().click();
  await expect.poll(slide).toBe("3");
  expect(await next().isDisabled()).toBe(false);
  await next().hover();
  await page.mouse.down();
  await expect.poll(() => status().textContent()).toBe("Paused");
  await next().dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up();
  await expect.poll(() => status().textContent()).toBe("Playing");
  expect(await slide()).toBe("3");
});

it("cancels without advancing on pointer exit or pointercancel, and resumes on unmount", async () => {
  await next().hover();
  await page.mouse.down();
  await next().dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up();
  await expect.poll(() => status().textContent()).toBe("Playing");
  expect(await slide()).toBe("1");
  await next().hover();
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect.poll(() => status().textContent()).toBe("Playing");
  expect(await slide()).toBe("1");
  await next().hover();
  await page.mouse.down();
  await expect.poll(() => status().textContent()).toBe("Paused");
  await page.getByRole("button", { name: "Hide next" }).evaluate((el: HTMLElement) => el.click());
  await page.mouse.up();
  await tick(interval / 2);
  await expect.poll(slide).toBe("2");
});

it("announces pause and play, ignores keyboard repeats, and keeps keyboard and semantic activation", async () => {
  expect(await next().getAttribute("aria-keyshortcuts")).toBe("P");
  expect(await next().getAttribute("aria-describedby")).toBe(await status().getAttribute("id"));
  await next().focus();
  await page.keyboard.down("p");
  await page.keyboard.down("p");
  await page.keyboard.up("p");
  await expect.poll(() => status().textContent()).toBe("Paused");
  await tick(interval);
  expect(await slide()).toBe("1");
  await next().press("Enter");
  await expect.poll(slide).toBe("2");
  expect(await status().textContent()).toBe("Paused");
  await next().press("p");
  await expect.poll(() => status().textContent()).toBe("Playing");
  await next().evaluate((el: HTMLElement) => el.click());
  await expect.poll(slide).toBe("3");
});
