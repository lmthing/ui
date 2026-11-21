import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL, URLSearchParams } from "node:url";
import { createServer } from "vite";
import type { LookOptions } from "./args";
import { bundleChecks, capture, galleryConfig, launchChrome } from "..";
import type { LookIssue } from "../checks";
import { variantSheet } from "../../variants";

export async function runLook(
  { id, widths, modes, presets, all }: LookOptions,
  out = fileURLToPath(new URL(`../../../shots/${id}/`, import.meta.url)),
) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const content = await bundleChecks();
  const server = await createServer(galleryConfig(0));
  const issues: (LookIssue & { width: number; mode: string })[] = [];
  try {
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (!base) throw new Error("Gallery did not start");
    const browser = await launchChrome();
    try {
      for (const width of widths) {
        for (const mode of modes) {
          const url = new URL(base);
          url.search = new URLSearchParams({ c: id, w: String(width), mode }).toString();
          for (const preset of presets) url.searchParams.append("preset", preset);
          issues.push(...(await capture(browser, url.href, out, width, mode, content)));
        }
      }
      if (all) {
        const { width, mode } = variantSheet;
        issues.push(
          ...(await capture(browser, `${base}?c=${id}&variant-sheet`, out, width, mode, content, true)),
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
  writeFileSync(join(out, "issues.json"), `${JSON.stringify(issues, null, 2)}\n`);
  return issues;
}
