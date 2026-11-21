import { createHash } from "node:crypto";
import { glob, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, matchesGlob, relative } from "node:path";

const cache = "node_modules/.cache";
const inputs = [
  "src/components",
  "src/surfaces",
  "src/packs",
  "src/catalog/copy",
  "src/catalog/meta/pack-ids.ts",
  "src/kit/base",
  "scripts/build/entries",
  "scripts/build/cache/cached-entries.ts",
  "package.json",
  "../../.prettierrc.json",
  "../../package.json",
  "../../pnpm-lock.yaml",
];
const doorPaths = ["src/packs/*/{components,copy}/index.ts", "src/{kit/base,catalog/copy}/index.ts"];

const missing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === "ENOENT";

async function fileTimes(
  path: string,
  root: string,
  include: (name: string) => boolean,
  walk = true,
): Promise<string[]> {
  try {
    const info = await stat(path, { bigint: true });
    const name = relative(root, path);
    if (!info.isDirectory() || !walk) {
      return include(name)
        ? [JSON.stringify([name, `${info.mtimeNs}`, `${info.ctimeNs}`, `${info.size}`])]
        : [];
    }
    const entries = await readdir(path, { withFileTypes: true });
    const children = await Promise.all(
      entries.map((entry) => fileTimes(join(path, entry.name), root, include, entry.isDirectory())),
    );
    return [...(include(name) ? [JSON.stringify([name])] : []), ...children.flat()];
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
}

async function fingerprint(root: string, paths: readonly string[], include: (name: string) => boolean) {
  const times = (await Promise.all(paths.map((path) => fileTimes(join(root, path), root, include)))).flat();
  return createHash("sha256").update(times.sort().join("\n")).digest("hex");
}

const inputFingerprint = (root: string) =>
  fingerprint(
    root,
    inputs,
    (name) =>
      (!name.startsWith("scripts/") || (name.endsWith(".ts") && !name.endsWith(".test.ts"))) &&
      !(name.endsWith("/index.ts") && doorPaths.some((path) => matchesGlob(name, path))),
  );

async function outputFingerprint(root: string) {
  const paths = ["src/entry"];
  for await (const door of glob(doorPaths, { cwd: root })) paths.push(door);
  return fingerprint(root, paths, (name) => name.endsWith(".ts"));
}

async function publishStamp(folder: string, target: string, value: string) {
  await mkdir(folder, { recursive: true });
  const staging = await mkdtemp(join(folder, "ui-entries-"));
  try {
    const temp = join(staging, "stamp");
    await writeFile(temp, value);
    await rename(temp, target);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function buildCachedEntries(root: string) {
  const folder = join(root, cache);
  const stamp = join(folder, "ui-entries.stamp");
  const [before, output, previous] = await Promise.all([
    inputFingerprint(root),
    outputFingerprint(root),
    readFile(stamp, "utf8").catch((error: unknown) => {
      if (!missing(error)) throw error;
    }),
  ]);
  if (previous === `${before}\n${output}\n`) return false;
  const { generateEntries } = await import("../entries");
  await generateEntries(root);
  if (before === (await inputFingerprint(root))) {
    await publishStamp(folder, stamp, `${before}\n${await outputFingerprint(root)}\n`);
  }
  return true;
}
