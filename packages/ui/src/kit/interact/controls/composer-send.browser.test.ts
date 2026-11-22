import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/composer-send-test";
const fixture = new URL("./composer-send.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "composer-send-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:390px"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 750 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByRole("textbox", { name: "Write a reply" }).waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("shows and clears the picked chip and lets the next draft replace sent feedback", async () => {
  const draft = page.getByRole("textbox", { name: "Write a reply" });
  const sent = page.getByTestId("home/reply/sent");
  const picked = page.getByTestId("home/reply/picked");
  await page.getByRole("button", { name: "Add attachment" }).click();
  await picked.waitFor();
  expect(await picked.textContent()).toBe("Attachment added");
  await draft.fill("My reply");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await sent.waitFor();
  expect(await sent.textContent()).toBe("Sent");
  expect(await draft.inputValue()).toBe("");
  expect(await picked.count()).toBe(0);
  expect(await page.getByTestId("home/chat/r2/text").textContent()).toBe("My reply");
  await draft.fill("A new draft");
  await sent.waitFor({ state: "detached" });
  expect(await draft.inputValue()).toBe("A new draft");
});
