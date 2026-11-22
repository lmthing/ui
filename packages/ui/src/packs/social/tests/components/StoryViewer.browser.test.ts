import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/story-viewer-test";
const fixture = new URL("./story-viewer.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "story-viewer-test",
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
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("plays, pauses and sends from the active slide on a 390px phone", async () => {
  await page.clock.install();
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const position = page.getByTestId("home/story/position");
  const request = page.locator("#request");
  await position.waitFor();
  expect(await button("Previous slide").isDisabled()).toBe(true);
  expect(await button("Send reply").isDisabled()).toBe(true);
  await button("Which cutting next?").click();
  expect(await request.textContent()).toBe('{"slide":0,"kind":"poll"}');
  const next = page.getByTestId("home/story/next");
  await next.press("p");
  await page.clock.runFor(5100);
  expect(await position.textContent()).toBe("Slide 2 of 2");
  await next.press("Enter");
  expect(await position.textContent()).toBe("Slide 2 of 2");
  expect(await button("Which cutting next?").count()).toBe(0);
  await next.press("p");
  await page.getByRole("textbox", { name: "Reply to this slide" }).fill("Love the fern!");
  await button("Send reply").click();
  await page.getByText("Reply sent.").waitFor();
  expect(await request.textContent()).toBe('{"slide":1,"text":"Love the fern!"}');
  expect(await position.textContent()).toBe("Slide 2 of 2");
  await button("React").click();
  expect(await request.textContent()).toBe('{"slide":1}');
  await button("Previous slide").click();
  expect(await position.textContent()).toBe("Slide 1 of 2");
  await button("Close story").click();
  await position.waitFor({ state: "detached" });
});

function barWidths() {
  return page.getByTestId("home/story/progress").evaluate((track) =>
    Array.from(track.children, (bar) => {
      const width = bar.getBoundingClientRect().width;
      const fill = bar.firstElementChild?.getBoundingClientRect().width ?? 0;
      return { width, fraction: fill / width };
    }),
  );
}

it("holds the active slide and its fill, resumes elapsed time, and advances on a short tap", async () => {
  await page.clock.install();
  await page.goto(new URL(`${route}?autoplay`, server.resolvedUrls!.local[0]).href);
  const next = page.getByTestId("home/story/next");
  const position = page.getByTestId("home/story/position");
  await expect.poll(() => next.getAttribute("aria-keyshortcuts")).toBe("P");
  expect(await page.getByRole("button", { name: /^(Play|Pause) story$/ }).count()).toBe(0);
  await page.clock.runFor(2000);
  const bars = await barWidths();
  expect(bars).toHaveLength(2);
  const [first, second] = bars;
  expect(first!.width).toBeCloseTo(second!.width, 1);
  expect(first!.fraction).toBeGreaterThan(0.35);
  expect(first!.fraction).toBeLessThan(0.7);
  expect(second!.fraction).toBe(0);
  await next.hover();
  await page.mouse.down();
  const statusId = await next.getAttribute("aria-describedby");
  const status = page.locator(`[id="${statusId}"]`);
  await expect.poll(() => status.textContent()).toBe("Story paused");
  const frozen = await barWidths();
  await page.clock.runFor(6000);
  expect(await barWidths()).toEqual(frozen);
  expect(await position.textContent()).toBe("Slide 1 of 2");
  await page.waitForTimeout(260);
  await page.mouse.up();
  await expect.poll(() => status.textContent()).toBe("Story playing");
  await page.clock.runFor(1000);
  expect(await position.textContent()).toBe("Slide 1 of 2");
  expect((await barWidths())[0]!.fraction).toBeGreaterThan(frozen[0]!.fraction);
  await page.clock.runFor(2100);
  await expect.poll(() => position.textContent()).toBe("Slide 2 of 2");
  expect((await barWidths())[0]!.fraction).toBe(1);
  await next.hover();
  await page.mouse.down();
  await expect.poll(() => status.textContent()).toBe("Story paused");
  await next.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up();
  await expect.poll(() => status.textContent()).toBe("Story playing");
  await page.clock.runFor(5100);
  await expect.poll(() => status.textContent()).toBe("Story paused");
  expect((await barWidths())[1]!.fraction).toBe(1);
  await page.getByRole("button", { name: "Previous slide" }).click();
  expect(await position.textContent()).toBe("Slide 1 of 2");
  await next.click();
  expect(await position.textContent()).toBe("Slide 2 of 2");
  await expect.poll(() => status.textContent()).toBe("Story paused");
  expect((await barWidths())[1]!.fraction).toBe(0);
});

it("replaces an open story with expiry copy and keeps dismissal available", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const position = page.getByTestId("home/story/position");
  await position.waitFor();
  await page.getByRole("button", { name: "Expire story" }).click();
  const expired = page.getByText("This story is no longer available.");
  await expired.waitFor();
  expect(await position.count()).toBe(0);
  expect(await page.getByRole("textbox", { name: "Reply to this slide" }).count()).toBe(0);
  await page.getByRole("button", { name: "Close story" }).click();
  await expired.waitFor({ state: "detached" });
});
