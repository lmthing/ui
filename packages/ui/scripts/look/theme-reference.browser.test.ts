import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { build, preview, type PreviewServer } from "vite";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { bundleChecks, galleryConfig, launchChrome } from ".";
import { openThemeReference } from "./theme-reference";

let server: PreviewServer;
let browser: Browser;
let page: Page;
let outDir: string | undefined;
const errors: string[] = [];
const base = () => server.resolvedUrls!.local[0]!;

beforeAll(async () => {
  const shots = new URL("../../shots/", import.meta.url);
  await mkdir(shots, { recursive: true });
  outDir = await mkdtemp(fileURLToPath(new URL("theme-reference-", shots)));
  const options = {
    ...galleryConfig(0),
    build: { outDir },
    preview: { host: "127.0.0.1", port: 0 },
  };
  await build(options);
  server = await preview(options);
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 1776, height: 960 } });
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);

afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    try {
      await server?.close();
    } finally {
      if (outDir) await rm(outDir, { recursive: true, force: true });
    }
  }
});

it.each(["light", "dark"])("shows all 36 complete reference phones in %s mode", async (mode) => {
  await openThemeReference(page, base(), mode);
  const phones = await page.locator("[data-reference-phone]").evaluateAll((frames) =>
    frames.map((frame) => {
      const screen = frame.getAttribute("data-reference-phone");
      const scroller = frame.querySelector(".is_ScrollView");
      const part = (address: string) => frame.querySelector(`[data-testid="${screen}/${address}"]`);
      const complete =
        screen === "list"
          ? part("walks/r5/title")?.textContent === "Otis"
          : screen === "dashboard"
            ? part("summary/r1/value")?.textContent === "24" && !!part("chart/r7/label")
            : part("time/field") instanceof HTMLInputElement &&
              part("save/root")?.textContent === "Save walk";
      return {
        name: frame.getAttribute("data-look-frame"),
        titled: Boolean(part("header/title")),
        complete,
        fits: Boolean(scroller && scroller.scrollHeight - scroller.clientHeight <= 1),
      };
    }),
  );
  expect(phones).toHaveLength(36);
  expect(new Set(phones.map(({ name }) => name)).size).toBe(36);
  expect(phones.filter(({ titled, complete, fits }) => !titled || !complete || !fits)).toEqual([]);
  expect(errors).toEqual([]);
});

const phone = (preset: string, screen: string) => page.locator(`[data-look-frame="${preset}/${screen}"]`);

it("renders the larger Bold title and loaded Sport digits", async () => {
  await openThemeReference(page, base(), "dark", "dashboard");
  const titleSize = (preset: string) =>
    phone(preset, "dashboard")
      .getByTestId("dashboard/header/title")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(await titleSize("bold")).toBeGreaterThan(await titleSize("calm"));
  const figure = phone("sport", "dashboard").getByTestId("dashboard/summary/r1/value");
  const font = await figure.evaluate(async (node) => {
    const css = getComputedStyle(node);
    const faces = await document.fonts.load('700 40px "Barlow Condensed"', "24");
    const loaded = faces.some(
      (face) => face.family.includes("Barlow Condensed") && face.weight === "700" && face.status === "loaded",
    );
    return { family: css.fontFamily, loaded };
  });
  expect(font).toEqual({ family: expect.stringContaining("Barlow Condensed"), loaded: true });
});

it("keeps ruled fields editable and draws the primary block and glow", async () => {
  await openThemeReference(page, base(), "dark", "form");
  const action = (preset: string) => phone(preset, "form").getByRole("button", { name: "Save walk" });
  const height = (preset: string) => action(preset).evaluate((node) => getComputedStyle(node).minHeight);
  expect(parseFloat(await height("bold"))).toBeGreaterThan(parseFloat(await height("calm")));
  const field = phone("paper", "form").getByTestId("form/dog/field");
  const fieldBorders = await field.evaluate((node) => {
    const borders = [];
    for (let parent = node.parentElement; parent && !parent.dataset.testid; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      borders.push([css.borderTopWidth, css.borderBottomWidth]);
    }
    return borders;
  });
  expect(fieldBorders).toContainEqual(["0px", "1px"]);
  await field.fill("Juniper");
  expect(await field.inputValue()).toBe("Juniper");
  expect(await phone("night", "form").getByTestId("form/dog/field").inputValue()).toBe("Clover");
  const shadow = await action("night").evaluate((node) => getComputedStyle(node).boxShadow);
  expect(shadow).not.toBe("none");
});

it("checks alignment independently for the dashboard's stats and chart", async () => {
  await openThemeReference(page, base(), "light", "dashboard");
  await page.addScriptTag({ content: await bundleChecks() });
  expect(await page.evaluate(() => window.lookChecks.find())).toEqual([]);
});
