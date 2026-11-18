import { mkdirSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig } from "../scripts/gallery-config";
import { launchChrome } from "../scripts";

let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];
const shots = new URL("../shots/Runtime/", import.meta.url).pathname;
mkdirSync(shots, { recursive: true });
beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome({
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    `globalThis.__name = (fn) => fn; globalThis.galleryLinks = []; globalThis.addEventListener("gallery-link", (event) => globalThis.galleryLinks.push(event.detail));`,
  );
}, 60000);
beforeEach(async () => {
  errors.length = 0;
  await page.goto(`${server.resolvedUrls!.local[0]}?runtime=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}, 30000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
const part = (address: string) => page.getByTestId(`home/${address}`);

describe("interactive phone screen", () => {
  it("opens and picks with taps, dismisses with Escape, and restores focus", async () => {
    expect(await part("s1/root").count()).toBe(0);
    await part("b1/root").focus();
    await part("b1/root").click();
    await page.getByRole("dialog", { name: "Room" }).waitFor();
    await page.screenshot({ path: `${shots}sheet.png` });
    expect(await page.evaluate(() => window.__lmthingUI!.act({ address: "b2", action: "press" }).ok)).toBe(
      false,
    );
    await part("s1/r2/root").click();
    await page.waitForFunction(() => window.__lmthingUI!.read().includes("Kitchen chosen"));
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    expect(await part("b1/root").evaluate((node) => node === document.activeElement)).toBe(true);
    const result = await page.evaluate(() =>
      window.__lmthingUI!.act([
        { address: "b1", action: "press" },
        { address: "s1/r3", action: "select" },
      ]),
    );
    expect(result.ok).toBe(true);
    await part("s1/close").click();
    expect(await page.getByRole("dialog").count()).toBe(0);
    await part("a1/r1/root").click();
    await page.getByRole("dialog", { name: "Room" }).waitFor();
    await part("s1/close").click();
    expect(await page.evaluate("galleryLinks.length")).toBe(0);
    expect(errors).toEqual([]);
  });
  it("runs a danger button only after confirmation for taps and agent actions", async () => {
    await part("b2/root").click();
    await page.getByRole("dialog", { name: "Remove this recording?" }).waitFor();
    await page.screenshot({ path: `${shots}confirm.png` });
    expect(await page.evaluate("galleryLinks.length")).toBe(0);
    await part("confirm/cancel").click();
    expect(await page.evaluate("galleryLinks.length")).toBe(0);
    await page.evaluate(() => window.__lmthingUI!.act({ address: "b2", action: "press" }));
    await part("confirm/confirm").waitFor();
    expect(await page.evaluate("galleryLinks.length")).toBe(0);
    await page.evaluate(() => window.__lmthingUI!.act({ address: "confirm/confirm", action: "press" }));
    await page.waitForFunction("galleryLinks.length === 1");
    expect(await page.evaluate("galleryLinks[0].goto")).toBe("removed");
    expect(await page.getByRole("dialog").count()).toBe(0);
    expect(errors).toEqual([]);
  });
});

describe("interactive phone screen", () => {
  it("plays and seeks a real local recording through act and keyboard controls", async () => {
    await page.waitForFunction(() => (document.querySelector("audio")?.readyState ?? 0) >= 1);
    await page.screenshot({ path: `${shots}screen.png` });
    expect(
      await page.evaluate(() => window.__lmthingUI!.act({ address: "p1/play", action: "play" }).ok),
    ).toBe(true);
    await page.waitForFunction(() => document.querySelector("audio")?.paused === false);
    await page.evaluate(() => window.__lmthingUI!.act({ address: "p1/play", action: "pause" }));
    await page.waitForFunction(() => document.querySelector("audio")?.paused === true);
    await page.evaluate(() => window.__lmthingUI!.act({ address: "p1/scrubber", action: "seek", value: 5 }));
    await page.waitForFunction(() => document.querySelector("audio")!.currentTime >= 5);
    expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain("0:05");
    await part("p1/scrubber").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector("audio")!.currentTime >= 6);
    await part("p1/forward").click();
    await page.waitForFunction(() => document.querySelector("audio")!.currentTime >= 21);
    expect(
      await page.evaluate(() =>
        window.__lmthingUI!.act({ address: "p1/scrubber", action: "seek", value: 31 }),
      ),
    ).toMatchObject({ ok: false });
    const box = await part("p1/scrubber").boundingBox();
    await part("p1/scrubber").click({ position: { x: box!.width / 2, y: box!.height / 2 } });
    await page.waitForFunction(() => Math.abs(document.querySelector("audio")!.currentTime - 15) <= 1);
    expect(errors).toEqual([]);
  });
});
