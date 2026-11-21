import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../scripts";
import { galleryConfig } from "../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/kit-bracket-registry-test";
const fixture = new URL("./KitBracket.registry.fixture.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "kit-bracket-registry-fixture",
        configureServer({ middlewares }) {
          middlewares.use(route, (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<!doctype html><div id="root" style="width:390px"></div><script type="module" src="/@fs${fixture}"></script>`,
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
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
  try {
    await page.getByRole("button", { name: "Add tie" }).waitFor({ timeout: 12000 });
  } catch (error) {
    throw new Error(`Bracket fixture did not mount: ${errors.join("; ")}`, { cause: error });
  }
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("remeasures the round part when another round gains a tie without resizing the heading", async () => {
  const address = "test/bracket/r3/round";
  const alias = page.getByTestId(address);
  const registeredY = () =>
    page.evaluate((part) => window.bracketParts().find(({ address }) => address === part)?.rect.y, address);
  const root = page.getByTestId("test/bracket/root");
  await alias.waitFor({ state: "attached" });
  const before = (await alias.boundingBox())!;
  const origin = (await root.boundingBox())!;
  await expect.poll(registeredY).toBeCloseTo(before.y - origin.y);
  await page.getByRole("button", { name: "Add tie" }).click();
  await page.getByTestId("test/bracket/r4/root").waitFor({ state: "attached" });
  const after = (await alias.boundingBox())!;
  expect(after.y).toBeGreaterThan(before.y);
  expect(after.height).toBe(before.height);
  expect(after.width).toBe(before.width);
  await expect.poll(registeredY).toBeCloseTo(after.y - origin.y);
});
