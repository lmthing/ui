import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.__name = (fn) => fn");
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
const ring = () => page.getByTestId("preview/c1/ring").locator("circle").nth(1);
const ratio = async () => {
  const values = (await ring().getAttribute("stroke-dasharray"))!.split(" ").map(Number);
  return values[0]! / values[1]!;
};
async function open() {
  await page.goto(`${server.resolvedUrls!.local[0]}?motion=ring_fill`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}
describe("motion acceptance", () => {
  it("reveals a ring once on cue and settles to the final amount", async () => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open();
    await page.waitForFunction(() => {
      const [part, full] = document
        .querySelectorAll("[data-testid='preview/c1/ring'] circle")[1]!
        .getAttribute("stroke-dasharray")!
        .split(" ")
        .map(Number);
      return Math.abs(part! / full! - 0.6) < 0.000001;
    });
    await page.getByTestId("preview/b1/root").click();
    expect(await ratio()).toBeLessThan(0.6);
    await page.waitForFunction(() => {
      const [part, full] = document
        .querySelectorAll("[data-testid='preview/c1/ring'] circle")[1]!
        .getAttribute("stroke-dasharray")!
        .split(" ")
        .map(Number);
      return Math.abs(part! / full! - 0.6) < 0.000001;
    });
    expect(await ratio()).toBeCloseTo(0.6, 3);
    expect(errors).toEqual([]);
  });
  it("shows signature end states in reduced-motion and agent modes", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open();
    expect(await ratio()).toBeCloseTo(0.6, 3);
    await page.getByTestId("preview/b1/root").click();
    expect(await ratio()).toBeCloseTo(0.6, 3);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open();
    await page.evaluate(() => window.__lmthingUI!.act({ address: "b1", action: "press" }));
    expect(await ratio()).toBeCloseTo(0.6, 3);
    expect(errors).toEqual([]);
  });
});
