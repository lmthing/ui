import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/mod-queue-test";
const fixture = new URL("./ModQueue.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "mod-queue-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 750 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.getByRole("button", { name: "Remove", exact: true }).waitFor();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("picks a rule on only one row and sends the removal only after confirmation", async () => {
  const rule = (row: string) =>
    page.getByTestId(`home/mod/${row}/reason`).getByRole("radio", { name: "No advertising" });
  const remove = page.getByRole("button", { name: "Remove", exact: true });
  const saved = page.getByText("Decision saved.", { exact: true });
  await rule("r2").click();
  expect(await rule("r2").getAttribute("aria-checked")).toBe("true");
  expect(await rule("r1").getAttribute("aria-checked")).toBe("false");
  await remove.click();
  await page.getByTestId("home/confirm/cancel").click();
  expect(await saved.count()).toBe(0);
  await remove.click();
  await page.getByTestId("home/confirm/confirm").click();
  await saved.waitFor();
  expect(await page.getByTestId("home/mod/r2/notice").textContent()).toBe("Decision saved.");
});
