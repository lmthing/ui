import { mkdirSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath, URL, URLSearchParams } from "node:url";
import type { Page } from "playwright-core";
import { build, preview } from "vite";
import { bundleChecks, galleryConfig, launchChrome } from ".";
import type { LookIssue } from "./checks";

const shots = new URL("../../shots/FullThemes/", import.meta.url);

export async function startThemeReferenceGallery() {
  const folder = new URL("../", shots);
  await mkdir(folder, { recursive: true });
  const outDir = await mkdtemp(fileURLToPath(new URL("theme-reference-", folder)));
  const options = { ...galleryConfig(0), build: { outDir }, preview: { host: "127.0.0.1", port: 0 } };
  const cleanup = () => rm(outDir, { recursive: true, force: true });
  try {
    await build(options);
    const server = await preview(options);
    return {
      base: server.resolvedUrls!.local[0]!,
      close: async () => {
        try {
          await server.close();
        } finally {
          await cleanup();
        }
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function openThemeReference(page: Page, base: string, mode: string, screen = "") {
  const url = new URL(base);
  url.search = new URLSearchParams({ "theme-reference": "", mode, ...(screen ? { screen } : {}) }).toString();
  await page.goto(url.href);
  const frames = page.locator("[data-reference-phone]");
  await frames.last().waitFor();
  const count = await frames.count();
  if (count !== (screen ? 12 : 36)) throw new Error(`Expected ${screen ? 12 : 36} phones, saw ${count}`);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return count;
}

async function captureThemes(page: Page, base: string) {
  const errors: string[] = [];
  const issues: (LookIssue & { mode: string })[] = [];
  const content = await bundleChecks();
  page.on("pageerror", (error) => errors.push(error.message));
  for (const mode of ["light", "dark"]) {
    for (const screen of ["", "list", "dashboard", "form"]) {
      const count = await openThemeReference(page, base, mode, screen);
      const path = fileURLToPath(new URL(`${mode}${screen ? `-${screen}` : ""}.png`, shots));
      await page.locator("[data-theme-reference]").screenshot({ path });
      if (screen) {
        await page.addScriptTag({ content });
        const found = await page.evaluate(() => window.lookChecks.find());
        issues.push(...found.map((issue) => ({ ...issue, mode })));
      }
      if (errors.length) throw new Error(errors.join("; "));
      console.log(`${count} phones: ${path}`);
    }
  }
  writeFileSync(new URL("issues.json", shots), `${JSON.stringify(issues, null, 2)}\n`);
  console.log(`${issues.length} automated look issues.`);
  return issues;
}

export async function runThemeReference() {
  mkdirSync(shots, { recursive: true });
  const gallery = await startThemeReferenceGallery();
  try {
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 1776, height: 960 } });
      return await captureThemes(page, gallery.base);
    } finally {
      await browser.close();
    }
  } finally {
    await gallery.close();
  }
}
