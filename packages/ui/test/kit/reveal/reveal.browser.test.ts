import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";
import { fakeSecret, revealStep } from "./fixture";

const route = "/kit-authenticated-reveal-test";
const view = new URL("./view.tsx", import.meta.url).pathname;
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-authenticated-reveal-fixture",
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

it("shows all zone labels and the reading in the calm phone view", async () => {
  const band = page.getByTestId("home/f1/band");
  for (const label of ["60", "Reading", "Low", "Middle", "High"]) {
    expect(await band.getByText(label, { exact: true }).isVisible()).toBe(true);
  }
  expect(await band.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

it("draws denial, temporary success and unavailable without exposing the secret to the agent", async () => {
  const value = page.getByTestId("home/f1/root");
  await expect.poll(() => value.textContent()).toBe("Value masked");
  const agent = await page.evaluateHandle(() => window.__lmthingUI);
  const attempt = await page.evaluate((step) => window.__lmthingUI!.act(step), revealStep);
  expect(attempt).toMatchObject({ ok: false });
  expect(await page.getByText(fakeSecret, { exact: true }).count()).toBe(0);

  await page.getByRole("button", { name: "Reveal value" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => value.textContent()).toBe("Waiting for authentication");
  await page.evaluate(() => window.finishRevealFixture("denied"));
  await expect.poll(() => value.textContent()).toBe("Authentication denied");
  expect(await page.getByText(fakeSecret, { exact: true }).count()).toBe(0);

  await page.clock.install();
  await page.getByRole("button", { name: "Reveal value" }).click();
  await page.evaluate(() => window.finishRevealFixture("approved"));
  await expect.poll(() => value.textContent()).toBe(fakeSecret);
  expect(await page.evaluate(() => window.__lmthingUI!.read())).not.toContain(fakeSecret);
  await page.clock.fastForward(15_000);
  await expect.poll(() => value.textContent()).toBe("Value masked");
  expect(await page.getByText(fakeSecret, { exact: true }).count()).toBe(0);

  await page.getByRole("button", { name: "Reveal value" }).click();
  await page.getByRole("button", { name: "Disconnect authentication" }).click();
  await page.evaluate(() => window.finishRevealFixture("approved"));
  await expect.poll(() => value.textContent()).toBe("Authentication unavailable");
  expect(await page.evaluate((previous) => window.__lmthingUI === previous, agent)).toBe(true);
  expect(await page.getByText(fakeSecret, { exact: true }).count()).toBe(0);
});
