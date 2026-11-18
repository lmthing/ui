import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { SourceFile } from "./config";

export function isSourceFile(file: string) {
  const name = basename(file);
  return name === "README.md" || (/\.(?:ts|tsx|mts)$/.test(name) && !name.endsWith(".generated.ts"));
}

export async function readSources(folder: string, ignored: readonly string[] = []): Promise<SourceFile[]> {
  if (ignored.includes(folder)) return [];
  const entries = await readdir(folder, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) return readSources(file, ignored);
      if (!entry.isFile() || !isSourceFile(file)) return [];
      return [{ file, source: await readFile(file, "utf8") }];
    }),
  );
  return groups.flat().sort((a, b) => a.file.localeCompare(b.file));
}
