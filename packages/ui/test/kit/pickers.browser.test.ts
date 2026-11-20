import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { bundleChecks, capture, galleryConfig, launchChrome } from "../../scripts/look";
import { part } from "./pickers.fixture";
import type { ActStep } from "@lmthing/ui/catalog";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/inline-picker-fixture";
const fixture = new URL("./pickers.view.tsx", import.meta.url).pathname;
const url = (query = "") => new URL(`${route}${query}`, server.resolvedUrls!.local[0]).href;
const at = (target: string) => page.getByTestId(part(target));
const act = (step: ActStep | ActStep[]) => page.evaluate((step) => window.__lmthingUI!.act(step), step);

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "inline-picker-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><script>globalThis.process ??= { env: {} };</script><div id="root"></div><script type="module" src="/@fs${fixture}"></script>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage();
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("opens, selects and clears by tap and by agent through the same mounted item root", async () => {
  await page.goto(url());
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
  await at("field").fill("Palm");
  await at("sort").click();
  const room = at("r1/root");
  const light = at("r2/root");
  await room.click();
  expect(await room.getAttribute("aria-expanded")).toBe("true");
  const ids = await page
    .getByTestId(/^home\/filters\//)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
  expect(ids.length).toBe(new Set(ids).size);
  expect(ids.filter((id) => id?.includes("/r1/"))).toEqual([part("r1/root")]);
  await page.getByRole("radio", { name: "Living room" }).click();
  expect(await room.textContent()).toBe("Room: Living room");
  expect(await room.getAttribute("aria-expanded")).toBe("false");
  expect(await act({ address: "filters/r2", action: "press" })).toMatchObject({ ok: true });
  expect(await light.getAttribute("aria-expanded")).toBe("true");
  expect(await act({ address: "filters/r2", action: "select", value: "Low light" })).toMatchObject({
    ok: true,
  });
  expect(await light.textContent()).toBe("Light: Low light");
  await at("clear").click();
  expect(await at("field").inputValue()).toBe("");
  expect(await room.textContent()).toBe("Room");
  expect(await light.textContent()).toBe("Light");
  expect(await at("sort").textContent()).toBe("Oldest first");
  await act([
    { address: "filters/field", action: "type", value: "Fern" },
    { address: "filters/r1", action: "select", value: "Study" },
  ]);
  expect(await room.textContent()).toBe("Room: Study");
  expect(await act({ address: "filters/clear", action: "press" })).toMatchObject({ ok: true });
  expect(await at("field").inputValue()).toBe("");
  expect(await room.textContent()).toBe("Room");
  expect(await at("sort").textContent()).toBe("Oldest first");
});

it("captures picker look sheets and passes the shared visual checks", async () => {
  if (!process.env.UI_PICKER_SHOTS) return;
  const out = new URL("../../shots/InlinePicker/", import.meta.url).pathname;
  mkdirSync(out, { recursive: true });
  const content = await bundleChecks();
  const issues: Awaited<ReturnType<typeof capture>> = [];
  for (const width of [320, 390, 430]) {
    for (const mode of ["light", "dark"]) {
      issues.push(...(await capture(browser, url(`?w=${width}&mode=${mode}`), out, width, mode, content)));
    }
  }
  writeFileSync(`${out}issues.json`, `${JSON.stringify(issues, null, 2)}\n`);
  expect(issues).toEqual([]);
}, 120000);
