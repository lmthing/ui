import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../../scripts";
import { galleryConfig } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/requests-options-test";
const fixture = new URL("./options.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "requests-options-test",
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

it("uses each opt-in control through the mounted phone screen", async () => {
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  const completed = page.getByRole("radio", { name: "Show completed" });
  const breached = page.getByTestId("desk/queue/r1/sla_breached");
  expect(await breached.innerText()).toBe("SLA breached");
  expect(await page.getByTestId("desk/queue/r2/root").count()).toBe(0);
  await completed.click();
  await breached.waitFor({ state: "detached" });
  await page.getByRole("link", { name: "Loose kennel gate" }).click();
  expect(await page.getByTestId("desk/thread/r1/file").innerText()).toBe("Attached file");
  await page.getByRole("button", { name: "Browse saved replies" }).click();
  const finish = page.getByRole("button", { name: "Finish work" });
  const sign = page.getByRole("checkbox", { name: "Sign off on work" });
  expect(await finish.isDisabled()).toBe(true);
  await sign.click();
  expect(await sign.getAttribute("aria-checked")).toBe("true");
  expect(await finish.isEnabled()).toBe(true);
  await sign.click();
  expect(await finish.isDisabled()).toBe(true);
  await sign.click();
  await finish.click();
  expect(await page.locator("#events").textContent()).toBe("kennel_gate\nsaved_replies\nfinish");
});
