import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../scripts";
import { galleryConfig } from "../../../scripts/look";

let server: ViteDevServer, browser: Browser, page: Page;
const route = "/controls-audio-test";
const fixture = new URL("./controls.fixture.tsx", import.meta.url).pathname;
const log = () => page.evaluate(() => window.controlLog.slice());
const allowMic = () => page.evaluate(() => window.allowMic());

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "controls-audio-fixture",
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
  page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name = (fn) => fn");
}, 60000);

beforeEach(async () => {
  const errors: string[] = [];
  const record = (error: Error) => errors.push(error.message);
  page.on("pageerror", record);
  try {
    await page.goto(new URL(route, server.resolvedUrls!.local[0]).href);
    await page.getByRole("button", { name: "Hold", exact: true }).waitFor({ timeout: 12000 });
    await page.clock.install();
  } catch (error) {
    throw new Error(`Controls fixture did not mount: ${errors.join("; ")}`, { cause: error });
  } finally {
    page.off("pageerror", record);
  }
}, 20000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("cancels taps and pointer exit, then fires exactly once for a full hold", async () => {
  const hold = page.getByTestId("test/hold/hold");
  expect(await page.evaluate(() => [window.attemptHold(false), window.attemptHold(true)])).toEqual([
    "hold_required",
    "hold_required",
  ]);
  await hold.click();
  await hold.hover();
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.clock.runFor(3100);
  await page.mouse.up();
  expect(await log()).toEqual([]);
  await hold.hover();
  await page.mouse.down();
  await page.clock.runFor(3100);
  await expect.poll(() => hold.getAttribute("aria-label")).toBe("Ready");
  await page.clock.runFor(3100);
  await page.mouse.up();
  expect(await log()).toEqual(["test/hold/hold press"]);
});

it("uses the release timestamp when no frame runs at the hold boundary", async () => {
  const hold = page.getByTestId("test/hold/hold");
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 1;
  });
  await hold.hover();
  await page.mouse.down();
  await page.clock.runFor(2900);
  await page.mouse.up();
  expect(await log()).toEqual([]);
  await page.mouse.down();
  await page.clock.runFor(3005);
  await page.mouse.move(1, 1);
  await page.mouse.up();
  expect(await log()).toEqual([]);
  await hold.hover();
  await page.mouse.down();
  await page.clock.runFor(3005);
  await page.mouse.up();
  expect(await log()).toEqual(["test/hold/hold press"]);
});

it("holds with the keyboard and uses separate remote actions, then disables all offline keys", async () => {
  const hold = page.getByTestId("test/hold/hold");
  await hold.focus();
  await page.keyboard.press("Enter");
  expect(await log()).toEqual([]);
  await page.keyboard.down("Space");
  await page.clock.runFor(3100);
  await page.keyboard.up("Space");
  await page.getByRole("button", { name: "Up", exact: true }).click();
  await page.getByRole("button", { name: "Volume down" }).press("Enter");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Go offline" }).click();
  expect(await page.getByRole("button", { name: "OK" }).isDisabled()).toBe(true);
  expect(await log()).toEqual([
    "test/hold/hold press",
    "test/remote/up press",
    "test/remote/volume_down decrement",
    "test/remote/play play",
  ]);
});

it("aborts a released hold before consent, then toggles an approved capture without a real device", async () => {
  const mic = page.getByRole("button", { name: "Record" });
  await mic.hover();
  await page.mouse.down();
  await expect.poll(log).toEqual(["open test/mic/record"]);
  await page.mouse.up();
  await allowMic();
  await expect.poll(log).toEqual(["open test/mic/record", "aborted", "closed cancel"]);
  await page.getByRole("button", { name: "Use toggle" }).click();
  await mic.press("Enter");
  await expect.poll(() => mic.getAttribute("aria-busy")).toBe("true");
  await allowMic();
  await expect.poll(() => mic.getAttribute("aria-pressed")).toBe("true");
  await mic.click();
  expect(await log()).toEqual([
    "open test/mic/record",
    "aborted",
    "closed cancel",
    "open test/mic/record",
    "test/mic/record start",
    "closed stop",
    "test/mic/record stop",
  ]);
});
