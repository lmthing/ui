import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";
import { copy, fixturePin, verify } from "./private-values.fixture";

const route = "/kit-private-values-test";
const view = new URL("./private-values.view.tsx", import.meta.url).pathname;
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-private-values-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root"></div><script type="module" src="/@fs${view}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  await page.waitForFunction(() => !!window.__lmthingUI);
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("draws a T9 sublabel and masks private entry made by pointer and physical keyboard", async () => {
  const value = page.getByTestId("home/vault/value");
  const key = page.getByTestId("home/vault/r3/root");
  await expect.poll(() => key.textContent({ timeout: 1000 })).toContain("ABC");
  const two = key.getByRole("button", { name: "2 ABC" });
  await two.waitFor({ state: "visible", timeout: 2000 });
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("textbox", { name: "Private input" }).press("2");
  await page.getByRole("textbox", { name: "Private input" }).press("Backspace");
  await two.click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await expect.poll(() => value.textContent()).toBe("•••");
  const read = await page.evaluate(() => window.__lmthingUI!.read());
  expect(read).not.toContain(fixturePin);
  expect(read).not.toContain("[vault/pad");
  expect(
    await page.evaluate((address) => window.__lmthingUI!.act({ address, action: "press" }), verify.address),
  ).toMatchObject({ ok: false });
  await page.getByRole("button", { name: "Verify input" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.locator("output").textContent()).toBe("approved");
  expect(await value.textContent()).not.toContain("•");
  expect(await page.evaluate((step) => window.__lmthingUI!.act(step), copy)).toMatchObject({ ok: false });
  await page.getByRole("button", { name: "Copy protected value" }).click();
  await expect.poll(() => page.getByRole("button", { name: "Copied" }).count()).toBe(1);
});

it("shows successful ordinary host copy without putting the output in the DOM or agent read", async () => {
  await page.getByRole("button", { name: "Copy generated value" }).click();
  await expect.poll(() => page.getByRole("button", { name: "Generated value copied" }).count()).toBe(1);
  expect(await page.getByText("synthetic-generated-output", { exact: true }).count()).toBe(0);
  expect(await page.evaluate(() => window.__lmthingUI!.read())).not.toContain("synthetic-generated-output");
});
