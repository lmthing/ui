import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { scanEntries } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it.each([
  ["packs/content", "Unknown pack folder: content"],
  ["packs/booking", undefined],
  ["packs/booking/components/nested/Draft.tsx", "Pack component must be in components/"],
  ["packs/booking/Draft.tsx", "Pack component must be in components/"],
  ["packs/booking/archetypes/BadName.ts", "Invalid archetype path"],
  ["packs/booking/pack.ts", "missing export: pack"],
])("validates %s", async (path, error) => {
  const root = await mkdtemp(resolve(".entries-test-"));
  roots.push(root);
  const file = join(root, "src", path);
  await mkdir(path.includes(".") ? resolve(file, "..") : file, { recursive: true });
  if (path.includes(".")) await writeFile(file, "");
  if (error) await expect(scanEntries(root)).rejects.toThrow(error);
  else
    expect(await scanEntries(root)).toEqual({
      defs: [],
      packs: [{ id: "booking", meta: false, archetypes: [], example: undefined, door: false }],
    });
});

it("rejects component ids shared by core and packs", async () => {
  const root = await mkdtemp(resolve(".entries-test-"));
  roots.push(root);
  for (const path of ["components", "packs/booking/components"]) {
    await mkdir(join(root, "src", path), { recursive: true });
    await writeFile(
      join(root, "src", path, "Draft.tsx"),
      `export const meta = { status: "draft" }; export const props = {}; export const fallback = () => ({}); export const examples = []; export const probes = [];`,
    );
  }
  await expect(scanEntries(root)).rejects.toThrow("Component id collision: Draft");
});
