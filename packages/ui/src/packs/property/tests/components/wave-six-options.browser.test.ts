import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/property-options-test";
const fixture = new URL("./wave-six-options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "property-options-test",
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

it("filters the vacancy list by date and dispatches only available tenant actions", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const testId = (address: string) => page.getByTestId(`home/${address}`);
  const date = testId("units/date");
  await testId("units/r1/occupancy").waitFor({ state: "visible" });
  await date.fill("2026-11-01");
  await testId("units/r1/occupancy").waitFor({ state: "detached" });
  expect(await testId("units/r2/occupancy").textContent()).toBe("Vacant");
  await date.fill("2026-11-18");
  expect(await testId("units/r1/occupancy").textContent()).toBe("Notice given");

  await testId("rent/r1/pay").click();
  expect(await testId("rent/r1/record").count()).toBe(0);
  const dispute = testId("inspection/r2/dispute");
  const sign = testId("inspection/r2/sign");
  const condition = testId("inspection/r2/condition").getByRole("radio", { name: "Not applicable" });
  await condition.click();
  expect(await condition.getAttribute("aria-checked")).toBe("true");
  await dispute.fill("The latch sticks.");
  await sign.waitFor({ state: "detached" });
  await dispute.fill("");
  await sign.click();
  expect(await page.locator("#actions").textContent()).toContain("home/rent/r1/pay press");
  expect(await page.locator("#actions").textContent()).toContain("home/inspection/r2/sign press");
});

it("keeps recorded attendance editable and switches meter history without carrying over evidence", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const outcome = page.getByRole("radiogroup", { name: "Change attendance" });
  const noShow = outcome.getByRole("radio", { name: "No-show" });
  const attended = outcome.getByRole("radio", { name: "Attended" });
  expect(await noShow.getAttribute("aria-checked")).toBe("true");
  await attended.click();
  expect(await attended.getAttribute("aria-checked")).toBe("true");
  expect(await noShow.getAttribute("aria-checked")).toBe("false");

  const meter = page.getByRole("radiogroup", { name: "Utility meters" });
  const evidence = page.getByTestId("home/meters/r4/photo");
  await evidence.click();
  expect(await page.locator("#actions").textContent()).toContain("home/meters/r4/photo press");
  await meter.getByRole("radio", { name: "Gas" }).click();
  await evidence.waitFor({ state: "detached" });
  expect(await page.getByTestId("home/meters/empty").textContent()).toBe("No readings yet");
  await meter.getByRole("radio", { name: "Water" }).click();
  await evidence.waitFor({ state: "visible" });
});
