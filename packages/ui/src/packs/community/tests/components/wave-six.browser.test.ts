import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import type { Browser } from "playwright-core";
import { galleryConfig, launchChrome } from "../../../../../scripts/look";

let server: ViteDevServer, browser: Browser;
const route = "/wave-six-community";
const fixture = new URL("./wave-six.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "community-options-fixture",
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

it.each(["grid", "rows"])(
  "respects %s arrangement and sends the chosen candidate to the host",
  async (arrange) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
    try {
      await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
      await page.goto(new URL(`${route}?${arrange}`, server.resolvedUrls!.local[0]).href);
      const choice = (name: string) => page.getByRole("checkbox", { name, exact: true });
      const ana = choice("Ana Reed"),
        lee = choice("Lee Ortiz"),
        jo = choice("Jo Bell");
      await ana.waitFor();
      const a = (await ana.boundingBox())!,
        l = (await lee.boundingBox())!;
      expect(Math.abs(l.x - a.x) > 20, JSON.stringify({ a, l })).toBe(arrange === "grid");
      expect(await ana.getAttribute("aria-checked")).toBe("true");
      await lee.click();
      await page.getByText("Your ballot: Ana Reed and Lee Ortiz").waitFor();
      expect(await jo.getAttribute("aria-disabled")).toBe("true");
      await ana.click();
      await page.getByText("Your ballot: Lee Ortiz").waitFor();
      await jo.click();
      await page.getByText("Your ballot: Lee Ortiz and Jo Bell").waitFor();
      await choice("Abstain").click();
      await page.getByText("Your ballot: Abstain").waitFor();
    } finally {
      await page.close();
    }
  },
);
