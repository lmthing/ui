import { fileURLToPath, URL } from "node:url";
import type { Browser } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

const route = "/places-options-test";
const fixture = fileURLToPath(new URL("./wave-six-options.fixture.tsx", import.meta.url));
let server: ViteDevServer, browser: Browser;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "places-options-fixture",
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
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("uses the live save switch, distance units and map layouts at phone width", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
  try {
    await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const save = page.getByRole("switch", { name: "Save place" });
    const distance = page.getByTestId("home/venue/distance");
    const target = page.locator("output");
    expect(await save.getAttribute("aria-checked")).toBe("true");
    await save.click();
    await expect.poll(() => save.getAttribute("aria-checked")).toBe("false");
    expect(await target.textContent()).toBe("");
    await page.getByRole("radio", { name: "mi" }).click();
    await expect.poll(() => distance.textContent()).toBe("1 mi away");
    expect(await target.textContent()).toBe("");

    const pin = page.getByRole("button", { name: "Select Greenhouse Shop on the map" });
    const active = page.getByTestId("home/places/active_place");
    expect(await active.textContent()).toBe("Riverside Nursery");
    expect(await page.getByRole("link", { name: "Greenhouse Shop" }).count()).toBe(0);
    await pin.click();
    await expect.poll(() => active.textContent()).toBe("Greenhouse Shop");
    await page.getByRole("radio", { name: "List", exact: true }).click();
    await expect.poll(() => pin.count()).toBe(0);
    await page.getByRole("radio", { name: "Map + list", exact: true }).click();
    await expect.poll(() => pin.getAttribute("aria-pressed")).toBe("true");
    await page.getByRole("link", { name: "Greenhouse Shop", exact: false }).click();
    await expect.poll(() => target.textContent()).toBe("greenhouse");
  } finally {
    await page.close();
  }
});
