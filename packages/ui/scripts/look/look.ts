// pnpm look --component <Id> [--widths 320,390,430]
// Renders the component as phone screens at several widths, in every preset and both modes, and:
//  - writes one screenshot per width and mode: packages/ui/shots/<Id>/<width>-<mode>.png
//    (columns are presets; every example and state is stacked);
//  - checks every screen automatically (clipped text, parts outside the screen, overlapping text,
//    contrast under WCAG AA, touch targets under 44×44, console errors);
//  - writes packages/ui/shots/<Id>/issues.json and exits 1 if there are issues.
// Starts its own gallery on a free port, so parallel agents never collide.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { launchChrome } from "./launch-chrome";
import { createServer } from "vite";
import { galleryConfig } from "./gallery-config";
import type { LookIssue } from "./checks";
import { bundleChecks } from "./bundle-checks";
import { capture } from "./capture";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function look(id: string, widths: number[]) {
  const out = new URL(`../../shots/${id}/`, import.meta.url).pathname;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const content = await bundleChecks();
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  const browser = await launchChrome();
  const issues: (LookIssue & { width: number; mode: string })[] = [];
  try {
    for (const width of widths) {
      for (const mode of ["light", "dark"] as const) {
        issues.push(
          ...(await capture(browser, `${base}?c=${id}&w=${width}&mode=${mode}`, out, width, mode, content)),
        );
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  writeFileSync(`${out}issues.json`, `${JSON.stringify(issues, null, 2)}\n`);
  return issues;
}

const id = arg("--component");
if (!id) throw new Error("Usage: pnpm look --component <Id> [--widths 320,390,430]");
const widths = (arg("--widths") ?? "320,390,430").split(",").map(Number);
const issues = await look(id, widths);
const unique = new Map(issues.map((i) => [`${i.kind}|${i.part}|${i.detail}`, i]));
for (const i of unique.values())
  console.log(`ISSUE ${i.kind.padEnd(8)} ${i.width}px ${i.mode} ${i.frame} ${i.part}: ${i.detail}`);
console.log(
  issues.length ? `\n${unique.size} distinct issue(s), ${issues.length} in total.` : "\nNo issues.",
);
process.exit(issues.length ? 1 : 0);
