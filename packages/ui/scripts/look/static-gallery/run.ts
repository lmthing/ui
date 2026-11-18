// pnpm gallery:static --out <dir> [--component A,B | --all]
// Exports the gallery as a static page for publishing: <dir>/index.html and <dir>/shots/<Id>.{card,grid}.jpg.
// Without --component or --all it shoots only components whose source changed since the last export
// (and every component on the first run). Prints one `GALLERY-FILE <path>` per new or changed file,
// relative to <dir>, and `GALLERY-PAGE <dir>/index.html`.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { galleryEntries, sourceOf, type GalleryEntry } from "./entries";
import { renderPage } from "./page";
import { shootComponents } from "./shoot";

type Manifest = { sources: Record<string, string>; images: Record<string, string> };

const hash = (path: string) =>
  existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 12) : "";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readManifest(path: string): Manifest {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Manifest;
  } catch {
    return { sources: {}, images: {} };
  }
}

function chooseIds(entries: GalleryEntry[], manifest: Manifest, pkg: string): string[] {
  const named = arg("--component")?.split(",").filter(Boolean);
  if (named) return named;
  if (process.argv.includes("--all")) return entries.map((e) => e.id);
  return entries.filter((e) => manifest.sources[e.id] !== hash(join(pkg, sourceOf(e)))).map((e) => e.id);
}

async function main() {
  const out = arg("--out");
  if (!out) throw new Error("Usage: pnpm gallery:static --out <dir> [--component A,B | --all]");
  const dir = resolve(out);
  const shots = join(dir, "shots");
  mkdirSync(shots, { recursive: true });
  const pkg = new URL("../../../", import.meta.url).pathname;
  const manifestPath = join(dir, "manifest.json");
  const manifest = readManifest(manifestPath);
  const entries = galleryEntries();
  const known = new Set(entries.map((e) => e.id));
  const ids = chooseIds(entries, manifest, pkg).filter((id) => known.has(id));
  await shootComponents(ids, shots);
  for (const id of ids) {
    const entry = entries.find((e) => e.id === id)!;
    manifest.sources[id] = hash(join(pkg, sourceOf(entry)));
    for (const kind of ["card", "grid"]) {
      const file = `${id}.${kind}`;
      const next = hash(join(shots, `${file}.jpg`));
      if (next !== manifest.images[file]) console.log(`GALLERY-FILE shots/${file}.jpg`);
      manifest.images[file] = next;
    }
  }
  const built = new Date().toISOString().slice(0, 16).replace("T", " ");
  writeFileSync(join(dir, "index.html"), renderPage(entries, manifest.images, `${built} UTC`));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`GALLERY-PAGE ${join(dir, "index.html")}`);
}

await main();
