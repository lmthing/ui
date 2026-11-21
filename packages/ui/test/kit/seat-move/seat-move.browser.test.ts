import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";

let server: ViteDevServer;
let browser: Browser;
const route = "/seat-move-fixture";
const fixture = new URL("./seat-move.page.tsx", import.meta.url).pathname;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "seat-move-fixture",
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
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("moves a seated guest by keyboard, click and agent without changing the guest address", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const address = "home/c1/r1/root";
    const guest = page.getByTestId(address);
    const moveTo = (table: string) => page.getByRole("button", { name: `Move Ari Shah to ${table}` });
    const activeAddress = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    const read = () => page.evaluate(() => window.__lmthingUI!.read());
    await guest.press("Enter");
    expect(await guest.getAttribute("aria-expanded")).toBe("true");
    expect(await moveTo("Birch").evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press("Escape");
    expect(await guest.getAttribute("aria-expanded")).toBe("false");
    expect(await activeAddress()).toBe(address);
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    expect(await moveTo("Cherry").evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press("Enter");
    expect(await read()).toContain('[c1/r1 move = "Cherry"; choices ["Oak","Birch"]]');
    expect(await guest.count()).toBe(1);
    expect(await activeAddress()).toBe(address);
    await guest.click();
    expect(await moveTo("Cherry").count()).toBe(0);
    await moveTo("Birch").click();
    expect(await read()).toContain('[c1/r1 move = "Birch"; choices ["Oak","Cherry"]]');
    const act = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r1", action: "move", value: "Oak" }),
    );
    expect(act.ok).toBe(true);
    expect(await read()).toContain('[c1/r1 move = "Oak"; choices ["Birch","Cherry"]]');
    expect(await guest.count()).toBe(1);
  } finally {
    await page.close();
  }
});

it("does not steal focus when an agent moves a guest with an open chooser", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    const ari = page.getByTestId("home/c1/r1/root");
    const bea = page.getByTestId("home/c1/r2/root");
    const beaFocused = () => bea.evaluate((element) => element === document.activeElement);
    await ari.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await beaFocused()).toBe(true);
    const result = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r1", action: "move", value: "Cherry" }),
    );
    expect(result.ok).toBe(true);
    await page.getByRole("button", { name: "Move Ari Shah to Oak" }).waitFor();
    expect(await beaFocused()).toBe(true);
  } finally {
    await page.close();
  }
});
