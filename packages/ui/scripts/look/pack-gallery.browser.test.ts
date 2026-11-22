import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";
import type { Browser, Page } from "playwright-core";
import { components, packOf, presets, type Definition } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "./index";

const folder = new URL("../../src/packs/", import.meta.url);
const packs = readdirSync(folder).filter((name) => existsSync(new URL(`${name}/pack.ts`, folder)));
const defs: Record<string, Definition> = components;
let server: PreviewServer, browser: Browser, outDir: string | undefined;

beforeAll(async () => {
  // Repeated document navigations must not refetch the whole unbundled development module graph.
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
