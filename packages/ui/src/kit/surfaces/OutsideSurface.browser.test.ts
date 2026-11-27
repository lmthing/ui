import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../../../scripts/look";
import { durations, size } from "../../catalog";

let server: ViteDevServer, browser: Browser;
const effect = "[data-outside-surface-effect]";
const variants = [
  ["Lock screen", "Check the fern tomorrow", "No reminder is scheduled."],
  ["Widget", "2 plants to check", "Not added to your home screen."],
  ["Message", "A care note for the fern", "No message is sent."],
] as const;

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function openGallery(reducedMotion: "reduce" | "no-preference" = "no-preference") {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
  await page.goto(`${server.resolvedUrls!.local[0]}?surfaces`);
  await page.getByRole("region", { name: "Lock screen preview" }).waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page;
}

it("renders all preview states without tab stops, links, or delivery roles", async () => {
  const page = await openGallery();
  try {
    const buttons = await page.getByRole("button").all();
    const targets = await Promise.all(buttons.map((button) => button.boundingBox()));
    for (const box of targets) {
      expect(box!.width).toBeGreaterThanOrEqual(size.control.md);
      expect(box!.height).toBeGreaterThanOrEqual(size.control.md);
    }
    for (const [label, title, note] of variants) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.press("Enter");
      const surface = page.getByRole("region", { name: `${label} preview`, exact: true });
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      for (const text of ["Ledge", title, note]) expect(await surface.getByText(text).isVisible()).toBe(true);
      expect(await surface.locator("a, button, input, [tabindex], [aria-live], [role=alert]").count()).toBe(
        0,
      );
      expect(await surface.getByRole("img").count()).toBe(0);
      expect(await button.evaluate((node) => node === document.activeElement)).toBe(true);
      expect(await surface.evaluate((node) => node.scrollWidth)).toBe(390);
      expect(await Promise.all(buttons.map((target) => target.boundingBox()))).toEqual(targets);
    }
    await page.keyboard.press("Tab");
    expect(
      await page.getByRole("button", { name: "Replay preview" }).evaluate((b) => b.matches(":focus")),
    ).toBe(true);
  } finally {
    await page.close();
  }
});

async function sampleReplay(page: Page) {
  return page.getByRole("button", { name: "Replay preview" }).evaluate(
    async (button, { effect, settle }) => {
      const layer = document.querySelector(effect)!;
      const opacity = () => Number(getComputedStyle(layer).opacity);
      const samples = [opacity()];
      const initial = layer.getBoundingClientRect().toJSON();
      let moved = false;
      const start = performance.now();
      (button as HTMLElement).click();
      while (performance.now() - start < settle) {
        await new Promise(requestAnimationFrame);
        samples.push(opacity());
        moved ||= JSON.stringify(layer.getBoundingClientRect().toJSON()) !== JSON.stringify(initial);
      }
      return { samples, moved };
    },
    { effect, settle: durations.fast * 3 },
  );
}

it("mounts complete and replays only the decorative layer, with no idle movement", async () => {
  const page = await openGallery();
  try {
    for (let replay = 0; replay < 2; replay++) {
      const { samples, moved } = await sampleReplay(page);
      expect(samples[0]).toBe(0);
      expect(Math.max(...samples)).toBeGreaterThan(0);
      expect(samples.slice(-3)).toEqual([0, 0, 0]);
      expect(moved).toBe(false);
    }
  } finally {
    await page.close();
  }
});

it("cuts the decorative replay under the OS reduced-motion preference", async () => {
  const page = await openGallery("reduce");
  try {
    const { samples, moved } = await sampleReplay(page);
    expect(samples.every((opacity) => opacity === 0)).toBe(true);
    expect(moved).toBe(false);
    expect(await page.getByText("Check the fern tomorrow").isVisible()).toBe(true);
  } finally {
    await page.close();
  }
});
