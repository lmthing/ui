// pnpm site [--out <dir>] [--all] [--no-shots] [--data]  (--data: only write src/generated, for dev)
// 1. gallery:static into .cache/gallery (thumbnails and the full static gallery), 2. generated data
// from the catalog and docs, 3. the Vite app, 4. dist/ = the app plus gallery/.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";
import { runGallery } from "./run-gallery";
import { loadSiteData } from "./site-data";
import { siteViteConfig } from "./vite-config";
import { writeBrand } from "./brand";
import { writeData } from "./write-data";

const site = new URL("../", import.meta.url).pathname;
const flag = (name: string) => process.argv.includes(name);
const arg = (name: string) => process.argv[process.argv.indexOf(name) + 1];

async function main() {
  const out = resolve(flag("--out") ? arg("--out")! : `${site}dist`);
  const cache = `${site}.cache/gallery`;
  const started = Date.now();
  mkdirSync(cache, { recursive: true });
  if (!flag("--no-shots")) runGallery(cache, flag("--all"));
  const data = loadSiteData();
  writeData(`${site}src/generated/site-data.json`, data);
  if (flag("--data")) return;
  rmSync(out, { recursive: true, force: true });
  await build(siteViteConfig(out));
  cpSync(cache, `${out}/gallery`, { recursive: true });
  await writeBrand(out, data);
  writeFileSync(`${out}/.nojekyll`, "");
  console.log(
    `SITE ${out} (${data.stats.built} components, ${data.packs.length} packs) in ${Math.round((Date.now() - started) / 1000)}s`,
  );
}

await main();
