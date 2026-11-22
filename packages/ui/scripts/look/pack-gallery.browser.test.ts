import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";
import type { Browser, Page } from "playwright-core";
import {
  components,
  ink,
  moss,
  packOf,
  paper,
  presets,
  themeRoles,
  warm,
  type Definition,
} from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "./index";

const folder = new URL("../../src/packs/", import.meta.url);
const packs = readdirSync(folder).filter((name) => existsSync(new URL(`${name}/pack.ts`, folder)));
const defs: Record<string, Definition> = components;
let server: PreviewServer, browser: Browser, outDir: string;

beforeAll(async () => {
  // This suite navigates every route in sequence. Serve the same bundle as the web build rather
  // than requesting the entire Vite development module graph again on each navigation.
  const shots = new URL("../../shots/", import.meta.url);
  await mkdir(shots, { recursive: true });
  outDir = await mkdtemp(fileURLToPath(new URL("pack-gallery-", shots)));
  const options = {
    ...galleryConfig(0),
    build: { outDir },
    preview: { host: "127.0.0.1", port: 0 },
  };
  await build(options);
  server = await preview(options);
  browser = await launchChrome();
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
  if (outDir) await rm(outDir, { recursive: true, force: true });
});

async function overview(page: Page, pack: string, ids: string[]) {
  await page.goto(`${server.resolvedUrls!.local[0]}?pack=${pack}`);
  await page.getByTestId(`component_${ids[0]}`).waitFor();
  expect(await page.locator('[data-testid^="component_"]').count()).toBe(ids.length);
  expect(await page.getByTestId("component_List").count()).toBe(0);
  for (const [id, owner] of Object.entries(packOf))
    if (owner !== pack) expect(await page.getByTestId(`component_${id}`).count()).toBe(0);
  for (const id of ids)
    if (defs[id]!.meta.status === "draft")
      expect(await page.getByTestId(`component_${id}`).innerText()).toContain("draft");
}

async function grid(page: Page, id: string) {
  await page.goto(`${server.resolvedUrls!.local[0]}?c=${id}`);
  await page.getByTestId(`variants_${id}`).waitFor();
  const def = defs[id]!;
  const cells =
    def.examples.length +
    (def.meta.states ?? ["filled"]).filter((state) => state !== "filled").length +
    (def.meta.draw && def.meta.status !== "draft" ? def.examples.length : 0);
  const previews = await page.locator('[data-testid^="preview_"]').allTextContents();
  expect(previews).toHaveLength(cells * presets.length * 2);
  if (def.meta.status === "draft") for (const text of previews) expect(text).toContain(`${id} · draft`);
  for (const preset of presets)
    for (const mode of ["light", "dark"])
      expect(previews.filter((text) => text.includes(`${preset.id} / ${mode}`))).toHaveLength(cells);
}

it.each(packs)(
  "renders %s's isolated overview and every ready/draft grid on a free port",
  async (pack) => {
    const ids = Object.entries(packOf)
      .filter(([, owner]) => owner === pack)
      .map(([id]) => id);
    expect(ids.length).toBeGreaterThan(0);
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await overview(page, pack, ids);
      for (const id of ids) await grid(page, id);
      expect(errors).toEqual([]);
    } finally {
      await page.close();
    }
  },
  120000,
);

it("registers preview palettes only when the gallery requests them", async () => {
  const page = await browser.newPage();
  try {
    const url = server.resolvedUrls!.local[0]!;
    await page.goto(`${url}?pack=commerce`);
    const card = page.getByTestId("component_Cart");
    await card.waitFor();
    const dark = "t_kit_warm_dark_moss";
    expect(
      await page.evaluate(
        (selector) =>
          Array.from(document.styleSheets).some((sheet) =>
            Array.from(sheet.cssRules).some((rule) => rule.cssText.includes(`.${selector}`)),
          ),
        dark,
      ),
    ).toBe(false);
    await card.getByRole("button", { name: /Show all/ }).click();
    const darkPreview = card.locator(`.${dark}`).first();
    await darkPreview.waitFor();
    const bg = (el: Element) => getComputedStyle(el).getPropertyValue("--bg").trim();
    expect(await darkPreview.evaluate(bg)).toBe(themeRoles(warm, moss, "dark").bg);
    await card.getByRole("button", { name: "Hide variants" }).click();
    await card.getByRole("button", { name: /Show all/ }).click();
    expect(await darkPreview.evaluate(bg)).toBe(themeRoles(warm, moss, "dark").bg);

    await page.goto(`${url}?controls=numbers&preset=paper&mode=dark&accent=ink`);
    const control = page.getByTestId("controls/c1/value");
    const accent = (el: Element) => getComputedStyle(el).getPropertyValue("--accent").trim();
    expect(await control.evaluate(bg)).toBe(themeRoles(paper, ink, "dark").bg);
    expect(await control.evaluate(accent)).toBe(themeRoles(paper, ink, "dark").accent);
  } finally {
    await page.close();
  }
});
