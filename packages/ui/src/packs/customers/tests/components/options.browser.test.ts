import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/customer-options-test";
const fixture = new URL("./options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "customer-options-test",
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

it("dispatches the opt-in controls and unmounts the payment link after settlement", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  await button("Email").click();
  await button("Download").click();
  await button("Share link").click();
  expect(await page.locator("#actions").textContent()).toBe(
    "home/client/email press\nhome/invoice/download press\nhome/payment/share press",
  );
  await button("Copy link").press("Enter");
  await button("Copied").waitFor();
  expect(await page.locator("#clipboard").textContent()).toBe("https://example.com/pay/trot");
  expect(await page.getByTestId("home/payment/code").locator("svg path").count()).toBeGreaterThan(0);
  await button("Settle payment").click();
  await page.getByTestId("home/payment/code").waitFor({ state: "detached" });
  expect(await button("Share link").count()).toBe(0);
  expect(await button("Copy link").count()).toBe(0);
  expect(await page.getByTestId("home/payment/r1/amount").textContent()).toBe("$20");
});
