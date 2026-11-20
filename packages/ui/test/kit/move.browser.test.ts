import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../../scripts/look";
import { launchChrome } from "../../scripts";

let server: ViteDevServer;
let browser: Browser;
const url = () => `${server.resolvedUrls!.local[0]}move.html`;
beforeAll(async () => {
  server = await createServer({ ...galleryConfig(0), root: new URL(".", import.meta.url).pathname });
  await server.listen();
  browser = await launchChrome();
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it("moves via keyboard, click and agent while keeping the original press link", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript("globalThis.__name = (fn) => fn");
  try {
    await page.goto(url(), { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__lmthingUI));
    const item = page.getByTestId("home/c1/r1/root");
    const finished = item.getByRole("button", { name: "Move Snake plant to Finished" });
    await finished.focus();
    expect(await finished.evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press("Enter");
    await item.getByRole("button", { name: "Move Snake plant to Waiting" }).waitFor();
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain('c1/r1 move = "Finished"');
    expect(await item.count()).toBe(1);
    await item.getByRole("link", { name: "Snake plant" }).click();
    expect(await page.locator("html").getAttribute("data-link")).toBe("snake_plant");
    await item.getByRole("button", { name: "Move Snake plant to In care" }).click();
    await page.waitForFunction(() => window.__lmthingUI!.read().includes('c1/r1 move = "In care"'));
    await item.getByRole("button", { name: "Move Snake plant to Waiting" }).press("Space");
    await page.waitForFunction(() => window.__lmthingUI!.read().includes('c1/r1 move = "Waiting"'));
    const result = await page.evaluate(() =>
      window.__lmthingUI!.act({ address: "c1/r1", action: "move", value: "Finished" }),
    );
    expect(result.ok).toBe(true);
    await item.getByRole("button", { name: "Move Snake plant to Waiting" }).waitFor();
    expect(await item.count()).toBe(1);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
  }
});
