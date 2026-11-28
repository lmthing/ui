import { mkdir } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { launchChrome } from "../../../../scripts";
import { galleryConfig } from "../../../../scripts/look";
import { size, space } from "../../../catalog";

const width = 390;
const height = 660;
const keyboard = 232;
const safe = { left: 26, right: 30, top: 24, bottom: 32 };
let server: ViteDevServer, browser: Browser, page: Page;
const errors: string[] = [];

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => Object.assign(globalThis, { __name: (fn: unknown) => fn }));
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const part = (address: string) => page.getByTestId(address);
const tab = (name: string) => page.getByRole("tab", { name, exact: true });
const back = () => page.getByRole("button", { name: "Back", exact: true });
const at = (id: string) => page.locator(`[data-navigation-shell="${id}"]`).waitFor();
const button = (name: string) => page.getByRole("button", { name, exact: true });
async function open(id = "today") {
  await page.goto(`${server.resolvedUrls!.local[0]}?nav-shell=${id}`);
  await at(id);
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}
async function box(locator: Locator) {
  await locator.waitFor();
  return (await locator.boundingBox())!;
}

it("switches peer roots by keyboard and agent action, then uses one back per pushed screen", async () => {
  await open();
  expect(await back().count()).toBe(0);
  expect(await tab("Today").getAttribute("aria-selected")).toBe("true");
  await tab("Today").press("Tab");
  expect(await tab("Plants").evaluate((node) => document.activeElement === node)).toBe(true);
  expect(await tab("Plants").evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await at("plants");
  expect(await tab("Plants").getAttribute("aria-selected")).toBe("true");
  expect(await part("plants/bath_plants/r1/root").count()).toBe(1);
  await part("plants/bath_plants/r1/root").click();
  await at("fern");
  expect(await page.getByRole("tablist").count()).toBe(0);
  expect(await back().count()).toBe(1);
  const quiet = page.getByRole("link", { name: "Watering history", exact: true });
  expect((await box(quiet)).height).toBeGreaterThanOrEqual(size.control.md);
  expect(
    await quiet.evaluate((node) => {
      for (let parent = node.parentElement; parent; parent = parent.parentElement)
        if (["auto", "scroll"].includes(getComputedStyle(parent).overflowY)) return true;
      return false;
    }),
  ).toBe(true);
  await quiet.click();
  await at("history");
  await back().click();
  await at("fern");
  await back().click();
  await at("plants");
  expect(await tab("Plants").getAttribute("aria-selected")).toBe("true");
  const result = await page.evaluate(() => window.__lmthingUI!.act({ address: "tabs/r1", action: "select" }));
  expect(result.ok).toBe(true);
  await at("today");
  expect(await tab("Today").getAttribute("aria-selected")).toBe("true");
  expect(errors).toEqual([]);
});

it("restores the same linked row and browser scroll position on keyboard Back", async () => {
  await open();
  const source = part("today/plants/r1/root");
  await source.focus();
  const body = page.locator("[data-kit-screen-body]");
  await body.evaluate((node) => {
    node.scrollTop = 24;
  });
  await page.keyboard.press("Enter");
  await at("fern");
  expect(await part("fern/h1/title").evaluate((node) => node === document.activeElement)).toBe(true);
  await back().focus();
  await page.keyboard.press("Space");
  await at("today");
  expect(await source.evaluate((node) => node === document.activeElement)).toBe(true);
  expect(await body.evaluate((node) => node.scrollTop)).toBe(24);
});

async function simulateInsets() {
  await page.evaluate((insets) => {
    const getStyle = window.getComputedStyle.bind(window);
    window.getComputedStyle = (el, pseudo) => {
      const style = getStyle(el, pseudo);
      if (!(el instanceof HTMLElement) || !el.style.cssText.includes("safe-area-inset")) return style;
      return new Proxy(style, {
        get: (target, key, receiver) => {
          const edge = {
            paddingLeft: "left",
            paddingRight: "right",
            paddingTop: "top",
            paddingBottom: "bottom",
          }[String(key)] as keyof typeof insets | undefined;
          return edge ? `${insets[edge]}px` : Reflect.get(target, key, receiver);
        },
      });
    };
    window.dispatchEvent(new Event("resize"));
  }, safe);
}

it("keeps the action above tabs and inside a shared safe area while the body scrolls", async () => {
  await open();
  await simulateInsets();
  const action = button("Log watering");
  const tabs = page.getByRole("tablist");
  await expect.poll(async () => height - (await box(tabs)).y - (await box(tabs)).height).toBe(safe.bottom);
  const a = await box(action);
  const b = await box(tabs);
  expect(a.y + a.height).toBeLessThan(b.y);
  expect(a.x).toBe(safe.left);
  expect(a.x + a.width).toBe(width - safe.right);
  expect(b.x).toBe(a.x);
  expect(b.width).toBe(a.width);
  const last = part("today/plants/r6/root");
  expect((await box(last)).y).toBeGreaterThan(a.y);
  await last.scrollIntoViewIfNeeded();
  const lastRow = await box(last);
  expect(a.y - (lastRow.y + lastRow.height)).toBeGreaterThanOrEqual(space.md);
  expect(await box(action)).toEqual(a);
  expect(await box(tabs)).toEqual(b);
  for (const name of ["Today", "Plants"]) {
    const target = await box(tab(name));
    expect(target.width).toBeGreaterThanOrEqual(size.control.md);
    expect(target.height).toBeGreaterThanOrEqual(size.control.md);
  }
  expect(errors).toEqual([]);
});

it("fits a wide badge beside the icon in a five-tab bar", async () => {
  await page.goto(`${server.resolvedUrls!.local[0]}?c=TabBar&w=390&mode=light&preset=calm`);
  const schedule = page.getByRole("tab", { name: "Schedule, 99+", exact: true }).last();
  const hit = await box(schedule);
  const glyph = await box(schedule.getByTestId(/\/icon$/));
  const badge = await box(schedule.getByTestId(/\/badge$/));
  const label = await box(schedule.getByTestId(/\/label$/));
  expect(glyph.x).toBeGreaterThanOrEqual(hit.x);
  expect(glyph.x + glyph.width).toBeLessThan(badge.x);
  expect(badge.x + badge.width).toBeLessThanOrEqual(hit.x + hit.width);
  expect(Math.max(glyph.y + glyph.height, badge.y + badge.height)).toBeLessThan(label.y);
  expect(errors).toEqual([]);
});

it("keeps a pushed form's focused field and save action above the keyboard, then shows a quiet result", async () => {
  await open();
  const opener = button("Log watering");
  const body = page.locator("[data-kit-screen-body]");
  await body.evaluate((node) => {
    node.scrollTop = 24;
  });
  await opener.click();
  await at("log");
  await expect
    .poll(() => part("log/h1/title").evaluate((node) => node === document.activeElement))
    .toBe(true);
  await simulateInsets();
  const field = part("log/note/field");
  await field.focus();
  await page.evaluate((visible) => {
    Object.defineProperty(visualViewport!, "height", { configurable: true, value: visible });
    visualViewport!.dispatchEvent(new Event("resize"));
  }, height - keyboard);
  const save = button("Save watering");
  await expect
    .poll(async () => (await box(save)).y + (await box(save)).height)
    .toBeLessThan(height - keyboard);
  const input = await box(field);
  expect(input.y + input.height).toBeLessThan((await box(save)).y);
  expect(await field.evaluate((node) => document.activeElement === node)).toBe(true);
  await save.click();
  await at("saved");
  expect(await page.getByRole("button").count()).toBe(1);
  expect(await back().count()).toBe(1);
  expect(await page.getByRole("tablist").count()).toBe(0);
  expect(await page.getByText("Fern watered").isVisible()).toBe(true);
  await back().click();
  await at("today");
  expect(await opener.evaluate((node) => node === document.activeElement)).toBe(true);
  expect(await body.evaluate((node) => node.scrollTop)).toBe(24);
  expect(errors).toEqual([]);
});

it.runIf(process.env.UI_NAVIGATION_SHELL_SHOTS === "1")(
  "captures the gallery fixtures for review",
  async () => {
    const output = new URL("../../../../shots/NavigationShell/", import.meta.url);
    await mkdir(output.pathname, { recursive: true });
    for (const id of ["today", "plants", "fern", "history", "log", "saved"]) {
      await open(id);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.waitForFunction(() => {
        const roots = document.querySelectorAll('[data-navigation-shell] [data-testid$="/root"]');
        return (
          roots.length > 0 &&
          Array.from(roots).every((element) => {
            for (let parent = element.parentElement; parent; parent = parent.parentElement)
              if (Number(getComputedStyle(parent).opacity) < 1) return false;
            return true;
          })
        );
      });
      await page
        .locator("[data-navigation-shell]")
        .screenshot({ path: new URL(`${id}.png`, output).pathname });
    }
  },
);
