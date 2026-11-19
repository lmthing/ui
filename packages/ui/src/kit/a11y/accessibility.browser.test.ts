import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { components, themeRoles, presets, accents, type ComponentName } from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { launchChrome } from "../../../scripts";
import { config, renderInstance } from "../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await launchChrome();
  page = await browser.newPage();
});
afterAll(async () => browser?.close());

function roleIssues(markup: string[]) {
  const focusable = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "[tabindex]",
    "[contenteditable=true]",
    '[role="button"]',
    '[role="link"]',
    '[role="switch"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="slider"]',
    '[role="textbox"]',
    '[role="searchbox"]',
  ].join(",");
  const container = '[role="list"], ul, ol';
  const listitem = '[role="listitem"], li';
  const hidden = '[aria-hidden="true"], [hidden], [inert]';
  const transparent = '[role="presentation"], [role="none"]';
  const exposedChildren = (node: Element): Element[] =>
    Array.from(node.children).flatMap((child) =>
      child.matches(`${hidden},style,script`)
        ? []
        : child.matches(transparent)
          ? exposedChildren(child)
          : [child],
    );
  return markup.flatMap((html, example) => {
    const document = new DOMParser().parseFromString(html, "text/html");
    const visible = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).filter((node) => !node.closest(hidden));
    const issues: string[] = [];
    for (const list of visible(container)) {
      const items = exposedChildren(list);
      if (!items.length || items.some((item) => !item.matches(listitem)))
        issues.push("list without valid children");
    }
    for (const item of visible(listitem)) {
      let parent = item.parentElement;
      while (parent?.matches(transparent)) parent = parent.parentElement;
      if (!parent?.matches(container)) issues.push("listitem without a list");
    }
    for (const text of visible('[role="text"]')) {
      if (Array.from(text.querySelectorAll(focusable)).some((child) => !child.closest(hidden))) {
        issues.push("focusable descendant of role=text");
      }
    }
    for (const toggle of visible('[role="switch"]')) {
      if (!toggle.getAttribute("aria-label")?.trim()) issues.push("unnamed switch");
    }
    return issues.map((issue) => `${example}: ${issue}`);
  });
}

describe("ready core and pack roles", () => {
  it.each(Object.keys(renderers) as ComponentName[])("%s exposes valid roles", async (id) => {
    const def = components[id];
    const markup = def.examples.map((example) => renderInstance(id, example, "filled", theme));
    for (const state of def.meta.states) {
      if (state !== "filled") markup.push(renderInstance(id, def.examples[0], state, theme));
    }
    expect(await page.evaluate(roleIssues, markup)).toEqual([]);
  });
});

it("names the List switch and keeps the Header action out of flattened text", async () => {
  await page.setContent(renderInstance("List", components.List.examples[0], "filled", theme));
  const list = page.getByRole("list");
  expect(await list.getByRole("listitem").count()).toBe(3);
  expect(await list.getByRole("switch", { name: "Fern", exact: true }).count()).toBe(1);
  await page.setContent(renderInstance("Header", components.Header.examples[0], "filled", theme));
  expect(await page.getByRole("button", { name: "Add a plant" }).count()).toBe(1);
  expect(await page.locator('[role="text"]').count()).toBe(0);
});

it("names a Vitals row from all its visible text in screen order", async () => {
  const example = components.Vitals.examples[2]!;
  await page.setContent(renderInstance("Vitals", example, "filled", theme));
  const expected = "Blood pressure 08:10 118 / 76 mmHg Systolic reference 90–120 Systolic: In range";
  const row = page.getByRole("button", { name: expected, exact: true });
  expect(await row.getAttribute("data-testid", { timeout: 3000 })).toBe("home/c1/r1/root");
});

it("uses the on-accent foreground in a host without Tamagui's root theme class", async () => {
  const html = renderInstance("Button", components.Button.examples[0], "filled", theme, {
    disableRootThemeClass: true,
  });
  const roles = themeRoles(presets[0], accents[0], theme.mode);
  await page.setContent(`<style>:root { --text: ${roles.text}; --accent: ${roles.accent}; } body { color: var(--text); }</style>
    <style>${config.getCSS()}</style>${html}`);
  const button = page.getByRole("button", { name: "Log watering" });
  const colors = await button.evaluate((node) => ({
    fill: getComputedStyle(node).backgroundColor,
    text: getComputedStyle(node.querySelector('[data-testid$="_label"]')!).color,
  }));
  const rgb = (hex: string) =>
    `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(", ")})`;
  expect(colors).toEqual({ fill: rgb(roles.accent), text: rgb(roles.onAccent) });
});
