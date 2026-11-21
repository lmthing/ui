import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { buildCachedEntries } from "./cached-entries";

it("rebuilds on input changes and missing generated files, and skips a warm cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "ui-entry-cache-"));
  const sources = join(root, "src/components");
  const source = join(sources, "Sample.tsx");
  const content = `
export const meta = {}, props = {}, fallback = {}, examples = [], probes = [];
export const Sample = () => null;
`;
  try {
    await mkdir(sources, { recursive: true });
    expect(await buildCachedEntries(root)).toBe(true);
    expect(await buildCachedEntries(root)).toBe(false);
    await writeFile(source, content);
    expect(await buildCachedEntries(root)).toBe(true);
    expect(await buildCachedEntries(root)).toBe(false);
    await writeFile(source, `${content}\n// Changed in place\n`);
    expect(await buildCachedEntries(root)).toBe(true);
    await rm(join(root, "src/entry/core.ts"));
    expect(await buildCachedEntries(root)).toBe(true);
    await rm(source);
    expect(await buildCachedEntries(root)).toBe(true);
    expect(await buildCachedEntries(root)).toBe(false);
    await mkdir(join(root, "src/packs/not-a-pack"), { recursive: true });
    await expect(buildCachedEntries(root)).rejects.toThrow("Unknown pack folder: not-a-pack");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
