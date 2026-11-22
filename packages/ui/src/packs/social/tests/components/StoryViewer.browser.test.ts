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
  await button("Play story").press("Enter");
  await page.clock.runFor(5100);
  expect(await position.textContent()).toBe("Slide 2 of 2");
  expect(await button("Next slide").isDisabled()).toBe(true);
  expect(await button("Which cutting next?").count()).toBe(0);
  await button("Pause story").click();
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
