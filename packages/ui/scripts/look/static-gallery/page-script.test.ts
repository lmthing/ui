import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { launchChrome } from "../index";
import type { GalleryEntry } from "./entries";
import { renderPage } from "./page";

const sample = (id: string, group: string, pack: string | null = null, status = "ready"): GalleryEntry => ({
  id,
  group,
  pack,
  status,
  tier: "phone",
  purpose: `Preview ${id}`,
});
const entries = [
  sample("CoreOne", "structure"),
  sample("CoreTwo", "content"),
  sample("DraftFirst", "data", "booking", "draft"),
  sample("TimeReady", "data", "booking"),
  sample("OtherReady", "action", "other"),
  sample("OtherDraft", "action", "other", "draft"),
];
let browser: Browser, page: Page;
const html = renderPage(entries, {}, "today");

beforeAll(async () => {
  browser = await launchChrome();
}, 20000);
beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/*", (route) =>
    route.fulfill({
      contentType: route.request().resourceType() === "document" ? "text/html" : "image/svg+xml",
      body:
        route.request().resourceType() === "document"
          ? html
          : '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"/>',
    }),
  );
  await page.goto("http://gallery.test/");
});
afterEach(async () => {
  await page?.close();
});
afterAll(async () => {
  await browser?.close();
});

it("combines all filters and updates section, overview and navigation counts", async () => {
  await page.click('#scope [data-value="packs"]');
  await page.click('#status [data-value="ready"]');
  await page.fill("#filter", "time");
  expect(await page.locator("#count").textContent()).toBe("1 components");
  expect(await page.locator("article:visible").count()).toBe(1);
  expect(await page.locator("[data-section]:visible").count()).toBe(1);
  expect(await page.locator("[data-overview]:visible").count()).toBe(1);
  expect(await page.locator('[data-overview="booking"]').textContent()).toContain(
    "1 components · 1 ready · 0 draft",
  );
  expect(await page.locator('[data-nav="booking"] [data-nav-count]').textContent()).toBe("1");
  expect(page.url()).toContain("#?scope=packs&status=ready&q=time");
  await page.reload();
  expect(await page.inputValue("#filter")).toBe("time");
  expect(await page.locator("article:visible").count()).toBe(1);
  await page.fill("#filter", "missing");
  expect(await page.locator("#none").isVisible()).toBe(true);
  expect(await page.locator("[data-section]:visible").count()).toBe(0);
});
it("focuses search with slash and clears only search with Escape", async () => {
  await page.click('#scope [data-value="packs"]');
  await page.keyboard.press("/");
  expect(await page.locator("#filter").evaluate((e) => e === document.activeElement)).toBe(true);
  await page.keyboard.type("time");
  await page.keyboard.press("Escape");
  expect(await page.inputValue("#filter")).toBe("");
  expect(await page.locator("#count").textContent()).toBe("4 components");
  expect(page.url()).toContain("#?scope=packs");
});
it("collapses sections without changing variant details or counts", async () => {
  await page.locator("#c-CoreOne summary").click();
  await page.click("#collapse");
  expect(await page.locator("[data-section]:visible .grid:visible").count()).toBe(0);
  expect(await page.locator("#c-CoreOne details").getAttribute("open")).not.toBeNull();
  expect(await page.locator("#count").textContent()).toBe("6 components");
  await page.click("#expand");
  expect(await page.locator("[data-section]:visible .grid:visible").count()).toBe(4);
  await page.locator("#s-booking .section-toggle").click();
  expect(await page.locator("#s-booking .grid").isVisible()).toBe(false);
  await page.locator('[data-nav="booking"]').click();
  expect(await page.locator("#s-booking .grid").isVisible()).toBe(true);
});
it("sorts pack drafts last only in compact, expands tiles and remembers density", async () => {
  await page.click('#view [data-value="compact"]');
  expect(await page.locator("#s-booking article").evaluateAll((nodes) => nodes.map((e) => e.id))).toEqual([
    "c-TimeReady",
    "c-DraftFirst",
  ]);
  expect(await page.locator("#c-TimeReady .card-body").isVisible()).toBe(false);
  await page.locator("#c-TimeReady .thumb").click();
  expect(await page.locator("#c-TimeReady .card-body").isVisible()).toBe(true);
  await page.locator("#c-TimeReady .compact-toggle").click();
  expect(await page.locator("#c-TimeReady .card-body").isVisible()).toBe(false);
  await page.reload();
  expect(await page.locator("body").getAttribute("data-view")).toBe("compact");
  await page.click('#view [data-value="cards"]');
  expect(await page.locator("#s-booking article").evaluateAll((nodes) => nodes.map((e) => e.id))).toEqual([
    "c-DraftFirst",
    "c-TimeReady",
  ]);
});
it("restores card anchors, opens their collapsed section and clears filters on plain anchors", async () => {
  await page.click("#collapse");
  await page.evaluate(() => {
    location.hash = "c-TimeReady";
  });
  await page.waitForFunction(() => document.querySelector("#c-TimeReady")?.hasAttribute("data-expanded"));
  expect(await page.locator("#s-booking .grid").isVisible()).toBe(true);
  const geometry = await page.locator("#c-TimeReady").evaluate((e) => ({
    top: e.getBoundingClientRect().top,
    header: document.querySelector("header")!.getBoundingClientRect().bottom,
  }));
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.header);
  await page.evaluate(() => {
    location.hash = "?scope=packs&status=ready&q=time";
  });
  await page.waitForFunction(() => document.querySelector("#count")?.textContent === "1 components");
  await page.evaluate(() => {
    location.hash = "c-CoreOne";
  });
  await page.waitForFunction(() => document.querySelector("#count")?.textContent === "6 components");
});
it("tracks the scrolled section, shows back-to-top and avoids phone overflow", async () => {
  await page.locator('[data-nav="other"]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-nav="other"]')?.getAttribute("aria-current") === "location",
  );
  expect(await page.locator(".back-top").isVisible()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  for (const view of ["cards", "compact"]) {
    await page.click(`#view [data-value="${view}"]`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const navTop = await page.locator(".section-nav").evaluate((e) => e.getBoundingClientRect().top);
  const headerBottom = await page.locator("header").evaluate((e) => e.getBoundingClientRect().bottom);
  expect(navTop).toBeGreaterThanOrEqual(headerBottom);
});
it("works when localStorage is unavailable", async () => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await page.reload();
  await page.click('#view [data-value="compact"]');
  expect(await page.locator("body").getAttribute("data-view")).toBe("compact");
  await page.fill("#filter", "time");
  expect(await page.locator("#count").textContent()).toBe("1 components");
});

it("highlights the final short section at the bottom in desktop compact view", async () => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.click('#view [data-value="compact"]');
  await page.locator('[data-nav="other"]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-nav="other"]')?.getAttribute("aria-current") === "location",
  );
  expect(await page.locator("#s-other").isVisible()).toBe(true);
  expect(await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 1)).toBe(
    true,
  );
});
