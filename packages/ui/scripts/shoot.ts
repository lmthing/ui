// pnpm shoot --component <Id> : screenshots of one component, one PNG per preset × mode, in
// packages/ui/shots/<Id>/<preset>-<mode>.png (gitignored). Starts the gallery on a free port and
// drives headless Chrome, so parallel agents never share a server. Look at every file it prints.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import { createServer } from "vite";
import { presets } from "../src/catalog";
import { galleryConfig } from "./gallery-config";

const run = promisify(execFile);
const chromes = [process.env.CHROME, "google-chrome", "chromium-browser", "chromium"].filter(Boolean);

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function chrome(): Promise<string> {
  for (const bin of chromes) {
    try {
      await run(bin!, ["--version"]);
      return bin!;
    } catch {
      /* try the next one */
    }
  }
  throw new Error("No Chrome found. Set CHROME to a Chrome or Chromium binary.");
}

async function shoot(id: string) {
  const bin = await chrome();
  const out = new URL(`../shots/${id}/`, import.meta.url).pathname;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const server = await createServer(galleryConfig(0));
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error("Gallery did not start");
  try {
    for (const preset of presets) {
      for (const mode of ["light", "dark"] as const) {
        const file = `${out}${preset.id}-${mode}.png`;
        const url = `${base}?c=${id}&preset=${preset.id}&mode=${mode}`;
        await run(bin, [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--window-size=820,2400",
          "--virtual-time-budget=15000",
          `--screenshot=${file}`,
          url,
        ]);
        if (!existsSync(file)) throw new Error(`No screenshot written for ${preset.id} ${mode}`);
        console.log(file);
      }
    }
  } finally {
    await server.close();
  }
}

const id = arg("--component");
if (!id) throw new Error("Usage: pnpm shoot --component <Id>");
await shoot(id);
