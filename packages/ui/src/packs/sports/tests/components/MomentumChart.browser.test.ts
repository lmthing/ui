import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, expect, it } from "vitest";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
const route = "/momentum-chart-fixture";
const fixture = new URL("./MomentumChart.fixture.tsx", import.meta.url).pathname;

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("selects markers by pointer and keyboard and keeps the compact chart passive", async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "momentum-chart-fixture",
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href, { waitUntil: "commit" });

  const curve = page.getByTestId("home/curve/root");
  const level = page.getByTestId("home/curve/r4/root");
  const lead = page.getByTestId("home/curve/r3/root");
  const brief = page.getByTestId("home/brief/root");
  await curve.getByText("Reed scores for Ledge").waitFor({ timeout: 30000 });
  await level.click();
  await curve.getByText("Fern House equalizes").waitFor();
  expect(await level.getAttribute("aria-pressed")).toBe("true");
  expect(await curve.getByText("42′ · 46%").isVisible()).toBe(true);
  await lead.press("Enter");
  await curve.getByText("Amara opens the scoring").waitFor();
  expect(await lead.getAttribute("aria-pressed")).toBe("true");
  expect(await level.getAttribute("aria-pressed")).toBe("false");
  expect(await brief.getByRole("button").count()).toBe(0);
  expect(await brief.getByText("Canal hits the post").count()).toBe(0);
  expect(errors).toEqual([]);
});
