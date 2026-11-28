import { mkdir, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import type { Browser, Locator, Page } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { artStyles } from "../../src/catalog";
import { bundleChecks, launchChrome } from ".";
import { startThemeReferenceGallery } from "./theme-reference";

const shots = new URL("../../shots/images/gallery/", import.meta.url);
const width = 390;
const height = 960;
const photoParts = ["icon", "hero", "monstera", "fern", "aloe", "empty"];
const phone = "[data-art-style]";
const hero = (page: Page) => page.getByTestId("ledge/hero/photo");
const photo = (part: string) => `ledge/${part}/photo`;
let gallery: Awaited<ReturnType<typeof startThemeReferenceGallery>>;
let browser: Browser;

beforeAll(async () => {
  await mkdir(shots, { recursive: true });
  gallery = await startThemeReferenceGallery();
  browser = await launchChrome();
}, 120_000);

afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await gallery?.close();
  }
});

function browse(page: Page, style = "", preview = false) {
  return page.goto(`${gallery.base}?art-styles=${style}${preview ? "&art-preview" : ""}`, {
    waitUntil: "domcontentloaded",
  });
}

async function checkDecoded(part: Locator) {
  const status = await part.locator("img").evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    return image.naturalWidth;
  });
  expect(status).toBeGreaterThan(0);
}

function settled(part: Locator) {
  return part.evaluate((node) => {
    for (let at: Element | null = node; at; at = at.parentElement) {
      const style = getComputedStyle(at);
      if (
        Number(style.opacity) < 1 ||
        (style.transform !== "none" && !new DOMMatrix(style.transform).isIdentity)
      )
        return false;
    }
    return true;
  });
}

async function readyPart(part: Locator) {
  await checkDecoded(part);
  await expect.poll(() => pose(part)).toBe(1);
  await expect.poll(() => settled(part)).toBe(true);
}

async function captureLook(page: Page, style: string, checks: string) {
  const app = page.locator(phone);
  expect((await app.boundingBox())?.width).toBe(width);
  await app.screenshot({ path: new URL(`${style}.png`, shots).pathname });
  await page.addScriptTag({ content: checks });
  const issues = await page.evaluate(() => window.lookChecks.find());
  await writeFile(new URL(`${style}-issues.json`, shots), `${JSON.stringify(issues, null, 2)}\n`);
  await page.evaluate(() => window.lookChecks.drawMarks());
  await app.screenshot({ path: new URL(`${style}-marks.png`, shots).pathname });
  return issues;
}

it("opens the gallery entry and switches the same complete, labeled 390-wide app across all styles", async () => {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const checks = await bundleChecks();
    const issues = [];
    await page.goto(gallery.base);
    await page.getByRole("link", { name: "Art styles" }).click();
    expect(await page.locator(phone).getAttribute("data-art-style")).toBe("natural_photo");
    await readyPart(hero(page));
    await page.screenshot({ path: new URL("style-picker.png", shots).pathname });
    for (const style of artStyles) {
      await page.locator(`a[href="?art-styles=${style}"]`).click();
      expect(await page.locator(phone).getAttribute("data-art-style")).toBe(style);
      expect(await page.locator(`a[href="?art-styles=${style}"]`).getAttribute("aria-current")).toBe("page");
      for (const part of photoParts) await readyPart(page.getByTestId(photo(part)));
      expect(await hero(page).getAttribute("aria-label")).toBe("potted monstera on a greenhouse bench");
      expect(await page.getByTestId(photo("empty")).getAttribute("aria-hidden")).toBe("true");
      await page.evaluate(() => document.fonts.ready);
      issues.push(...(await captureLook(page, style, checks)));
    }
    await browse(page, "unknown");
    expect(await page.locator(phone).getAttribute("data-art-style")).toBe("natural_photo");
    expect(errors).toEqual([]);
    expect(issues).toEqual([]);
  } finally {
    await page.close();
  }
}, 90_000);

function holdHero(page: Page) {
  let resolve!: (delivery: "continue" | "abort") => void;
  const promise = new Promise<"continue" | "abort">((send) => {
    resolve = send;
  });
  const route = page.route("**/art-styles/*-hero.jpg", async (request) => {
    if ((await promise) === "continue") await request.continue();
    else await request.abort();
  });
  return { route, resolve };
}

function pose(part: Locator) {
  return part.locator("[data-kit-photo-layer]").evaluate((node) => Number(getComputedStyle(node).opacity));
}

function traceArrival(part: Locator) {
  return part.evaluate(
    (node) =>
      new Promise<{ ms: number; opacity: number; y: number }[]>((done) => {
        const start = performance.now();
        const trace: { ms: number; opacity: number; y: number }[] = [];
        const sample = () => {
          const layer = node.querySelector("[data-kit-photo-layer]")!;
          const ms = Math.round(performance.now() - start);
          const opacity = Number(getComputedStyle(layer).opacity);
          trace.push({ ms, opacity, y: node.getBoundingClientRect().y });
          if (opacity === 1 || ms > 2000) done(trace);
          else requestAnimationFrame(sample);
        };
        sample();
        node.setAttribute("data-arrival-sampling", "");
      }),
  );
}

it.each(["no-preference", "reduce"] as const)(
  "reserves the hero crop and reveals the decoded asset with motion preference %s",
  async (reducedMotion) => {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const pending = holdHero(page);
    const frame = hero(page);
    const shot = (phase: string) => new URL(`arrival-${reducedMotion}-${phase}.png`, shots).pathname;
    try {
      await pending.route;
      await browse(page, "paper_cut", true);
      await frame.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => settled(frame)).toBe(true);
      expect(await pose(frame)).toBe(0);
      const before = await frame.boundingBox();
      await page.screenshot({ path: shot("pending") });
      const arrival = traceArrival(frame);
      await page.locator("[data-arrival-sampling]").waitFor({ state: "attached" });
      pending.resolve("continue");
      await readyPart(frame);
      const trace = await arrival;
      expect(trace[0]?.opacity).toBe(0);
      expect(trace.at(-1)?.opacity).toBe(1);
      expect(trace.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(reducedMotion === "no-preference");
      expect(new Set(trace.map(({ y }) => y))).toEqual(new Set([before!.y]));
      expect(await frame.boundingBox()).toEqual(before);
      await page.screenshot({ path: shot("settled") });
      await writeFile(
        new URL(`arrival-${reducedMotion}.json`, shots),
        `${JSON.stringify({ fixture: "Ledge, paper_cut, calm light 390", trigger: "deliver held hero JPEG", before, after: await frame.boundingBox(), trace }, null, 2)}\n`,
      );
    } finally {
      pending.resolve("abort");
      await page.close();
    }
  },
);

it("keeps the failed generated image in its original crop without hiding the headline", async () => {
  const page = await browser.newPage({ viewport: { width, height } });
  const pending = holdHero(page);
  try {
    await pending.route;
    await browse(page, "paper_cut", true);
    const frame = hero(page);
    await frame.locator("img").waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => settled(frame)).toBe(true);
    const before = await frame.boundingBox();
    pending.resolve("abort");
    await frame.locator("img").waitFor({ state: "detached" });
    expect(await frame.boundingBox()).toEqual(before);
    expect(await page.getByTestId("ledge/hero/title").textContent()).toBe("Today’s plant care");
  } finally {
    pending.resolve("abort");
    await page.close();
  }
});
