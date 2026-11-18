import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SourceFile } from "./config";

export async function readSources(folder: string): Promise<SourceFile[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) return readSources(file);
      if (!entry.isFile()) return [];
      return [{ file, source: await readFile(file, "utf8") }];
    }),
  );
  return groups.flat().sort((a, b) => a.file.localeCompare(b.file));
}
