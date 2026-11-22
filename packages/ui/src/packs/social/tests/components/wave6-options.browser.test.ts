import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/social-options-test";
const fixture = new URL("./wave6-options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "social-options-test",
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

it("operates the social options using the addressed on-screen controls", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const target = (owner: string, part: string) => page.getByTestId(`home/${owner}/${part}`);
  const save = target("feed/r1", "save");
  await save.waitFor();
  expect(await save.getAttribute("aria-label")).toBe("Remove saved post");
  expect(await save.getAttribute("aria-disabled")).toBeNull();
  await save.click();
  await expect.poll(() => save.getAttribute("aria-label")).toBe("Save post");
  const postSave = target("post", "save");
  expect(await postSave.getAttribute("aria-label")).toBe("Save post");
  await postSave.click();
  await expect.poll(() => postSave.getAttribute("aria-label")).toBe("Remove saved post");
  expect(await save.getAttribute("aria-label")).toBe("Save post");

  const video = target("feed/r1", "video");
  await video.click();
  await page.getByText("Host video").waitFor();
  expect(await video.getAttribute("aria-label")).toBe("Pause post video");
  await video.press("Enter");
  await expect.poll(() => video.getAttribute("aria-label")).toBe("Play post video");
  expect(await target("post", "video").getAttribute("aria-disabled")).toBe("true");
  expect(await page.locator("#destination").textContent()).toBe("");

  await target("stories/r1", "root").click();
  await expect.poll(() => page.locator("#destination").textContent()).toBe("fern_story");
  expect(await target("invite/r2", "name").textContent()).toBe("Sam");
  await target("invite", "share").click();
  await expect.poll(() => page.locator("#action").textContent()).toMatch(/invite\/share$/);
});
