import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/live-room-test";
const fixture = new URL("./live-room.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "live-room-test",
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

it("keeps stage controls usable at 390px and confirms ending the room", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const request = page.locator("#request");
  const controls = await Promise.all(
    ["Raise hand", "Reactions", "Leave", "End room"].map((name) => button(name).boundingBox()),
  );
  expect(controls.every((box) => box && box.height >= 44 && box.y === controls[0]?.y)).toBe(true);
  await button("Raise hand").click();
  await button("Lower hand").waitFor();
  expect(await request.textContent()).toContain("room.hand:");
  await button("Reactions").click();
  await button("Send a heart").click();
  expect(await request.textContent()).toContain('"reaction":"heart"');
  await button("End room").click();
  const confirm = page.getByTestId("home/confirm/confirm");
  await confirm.waitFor({ timeout: 3000 });
  expect(await request.textContent()).not.toContain("room.end:");
  await confirm.click();
  expect(await request.textContent()).toBe('room.end:{"room":"fern_room"}');
  await button("Leave").click();
  expect(await request.textContent()).toBe('room.leave:{"room":"fern_room"}');
  await button("Leave").waitFor({ state: "detached" });
});
