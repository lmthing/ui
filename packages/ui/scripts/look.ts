// pnpm look --component <Id> [--widths 320,390,430]
// Renders the component as phone screens at several widths, in every preset and both modes, and:
//  - writes one screenshot per width and mode: packages/ui/shots/<Id>/<width>-<mode>.png
//    (columns are presets; every example and state is stacked);
//  - checks every screen automatically (clipped text, parts outside the screen, overlapping text,
//    contrast under WCAG AA, touch targets under 44×44, console errors);
//  - writes packages/ui/shots/<Id>/issues.json and exits 1 if there are issues.
// Starts its own gallery on a free port, so parallel agents never collide.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { galleryConfig } from "./gallery-config";
import { drawMarks, findIssues, type LookIssue } from "./look-checks";

const chromes = [
  process.env.CHROME,
  "/usr/bin/google-chrome",
  `${process.env.HOME}/.local/bin/google-chrome`,
  "/usr/bin/chromium-browser",
];

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function launch() {
  for (const executablePath of chromes.filter((path): path is string => Boolean(path))) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch {
      /* try the next one */
    }
  }
  throw new Error("No Chrome found. Set CHROME to a Chrome or Chromium binary.");
}

export async function look(id: string, widths: number[]) {
  const out = new URL(`../shots/${id}/`, import.meta.url).pathname;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  const browser = await launch();
  const issues: (LookIssue & { width: number; mode: string })[] = [];
  try {
    for (const width of widths) {
      for (const mode of ["light", "dark"] as const) {
        const page = await browser.newPage({ viewport: { width: width * 3 + 120, height: 900 } });
        // tsx keeps function names with a __name helper; give the page a no-op one.
        await page.addInitScript("globalThis.__name = (fn) => fn");
        const errors: string[] = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${base}?c=${id}&w=${width}&mode=${mode}`, { waitUntil: "networkidle" });
        await page.waitForSelector("[data-look-frame]", { timeout: 15000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
        });
        await page.screenshot({ path: `${out}${width}-${mode}.png`, fullPage: true });
        const found = await page.evaluate(findIssues);
        if (width === 390) {
          await page.evaluate(drawMarks);
          await page.screenshot({ path: `${out}${width}-${mode}-marks.png`, fullPage: true });
        }
        for (const issue of found) issues.push({ ...issue, width, mode });
        for (const error of errors)
          issues.push({ kind: "console", frame: "page", part: "-", detail: error, width, mode });
        console.log(`${out}${width}-${mode}.png`);
        await page.close();
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
