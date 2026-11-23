import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, expect, it } from "vitest";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
const route = "/match-stats-fixture";
const fixture = new URL("./MatchStats.fixture.tsx", import.meta.url).pathname;

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("switches the visible metric values, shows unavailable data and returns to the full match", async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "match-stats-fixture",
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

  const incomplete = page.getByTestId("home/c1/root");
  const complete = page.getByTestId("home/c2/root");
  const unavailable = incomplete.getByText("Match stats are unavailable.");
  const overall = complete.getByRole("radio", { name: "Full match" });
  const half = complete.getByRole("radio", { name: "First half" });
  await complete.getByText("58%", { exact: true }).waitFor({ timeout: 30000 });
  await incomplete.getByRole("radio", { name: "Second half" }).click();
  await unavailable.waitFor();
  await half.click();
  await complete.getByText("46%", { exact: true }).waitFor();
  expect(await half.getAttribute("aria-checked")).toBe("true");
  expect(await complete.getByText("58%", { exact: true }).count()).toBe(0);
  await overall.click();
  await complete.getByText("58%", { exact: true }).waitFor();
  expect(await unavailable.isVisible()).toBe(true);
  expect(errors).toEqual([]);
});
