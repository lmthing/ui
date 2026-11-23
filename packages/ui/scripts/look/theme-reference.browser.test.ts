import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from ".";
import { openThemeReference } from "./theme-reference";

let server: ViteDevServer;
let browser: Browser;
let page: Page;
const base = () => server.resolvedUrls!.local[0]!;

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 1776, height: 960 } });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it.each(["light", "dark"])("shows all 36 complete reference phones in %s mode", async (mode) => {
  await openThemeReference(page, base(), mode);
  const phones = await page.locator("[data-reference-phone]").evaluateAll((frames) =>
    frames.map((frame) => ({
      name: frame.getAttribute("data-look-frame"),
      titles: frame.querySelectorAll('[data-testid$="/header/title"]').length,
      cutOff: Array.from(frame.querySelectorAll(".is_ScrollView")).some(
        (node) => node.scrollHeight - node.clientHeight > 1,
      ),
    })),
  );
  expect(phones).toHaveLength(36);
  expect(new Set(phones.map(({ name }) => name)).size).toBe(36);
  expect(phones.filter(({ titles, cutOff }) => titles !== 1 || cutOff)).toEqual([]);
});

it("renders the type, paper rules and action glow through the actual screens", async () => {
  await openThemeReference(page, base(), "dark");
  const phone = (preset: string, screen: string) => page.locator(`[data-look-frame="${preset}/${screen}"]`);
  const titleSize = (preset: string) =>
    phone(preset, "dashboard")
      .getByTestId("dashboard/header/title")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(await titleSize("bold")).toBeGreaterThan(await titleSize("calm"));
  const figure = phone("sport", "dashboard").getByTestId("dashboard/summary/r1/value");
  const font = await figure.evaluate((node) => {
    const css = getComputedStyle(node);
    return { family: css.fontFamily, loaded: document.fonts.check('700 40px "Barlow Condensed"', "24") };
  });
  expect(font).toEqual({ family: expect.stringContaining("Barlow Condensed"), loaded: true });
  const field = phone("paper", "form").getByTestId("form/dog/field");
  expect(
    await field.evaluate((node) => {
      const css = getComputedStyle(node.parentElement!);
      return [css.borderTopWidth, css.borderBottomWidth];
    }),
  ).toEqual(["0px", "1px"]);
  await field.fill("Juniper");
  expect(await field.inputValue()).toBe("Juniper");
  expect(await phone("night", "form").getByTestId("form/dog/field").inputValue()).toBe("Clover");
  const shadow = await phone("night", "form")
    .getByRole("button", { name: "Save walk" })
    .evaluate((node) => getComputedStyle(node).boxShadow);
  expect(shadow).not.toBe("none");
});
