import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { format } from "prettier";
import { expect, it } from "vitest";
import { generateEntries } from "../build/entries";
import { checkRules } from "../rules";
import { generateComponent } from "./generate";

const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
const dist = join(workspace, "packages/ui/dist");

async function inFixture(check: (root: string) => Promise<void>) {
  await mkdir(dist, { recursive: true });
  const root = await mkdtemp(join(dist, "component-gen-"));
  try {
    await check(root);
  } finally {
    await rm(root, { recursive: true });
  }
}

async function put(root: string, file: string, source: string) {
  const path = join(root, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

it("generates an unbuilt Wave 6 pack component and preserves subsequent edits", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    await put(root, doc, await readFile(join(workspace, doc), "utf8"));
    await put(root, ".prettierrc.json", '{"printWidth": 58}\n');
    const pack = "src/packs/weather";
    const first = await generateComponent(root, "weather", "AstroSun");
    expect(first.written).toEqual([
      `${pack}/tests/AstroSun.test.ts`,
      `${pack}/copy/AstroSun.ts`,
      `${pack}/lang/astro-sun.ts`,
      `${pack}/components/AstroSun.tsx`,
    ]);
    const ui = join(root, "packages/ui");
    const component = join(ui, `${pack}/components/AstroSun.tsx`);
    const original = await readFile(component, "utf8");
    expect(original).toContain('status: "draft"');
    expect(original).toBe(await format(original, { filepath: component, printWidth: 58 }));
    expect(await readFile(join(ui, pack, "index.ts"), "utf8")).toBe('export * from "./components";\n');
    const door = join(ui, pack, "components/index.ts");
    expect(await readFile(door, "utf8")).toBe('export * as AstroSun from "./AstroSun";\n');
    expect(await checkRules(ui)).toEqual([]);
    await generateEntries(ui);
    expect(await readFile(join(ui, "src/entry/packs/group-1/weather.ts"), "utf8")).toContain(
      'import { AstroSun } from "../../../packs/weather";',
    );
    expect(await readFile(join(ui, "src/entry/views/group-1.ts"), "utf8")).not.toContain("AstroSun");
    const edited = original.replace("TODO: describe the nearest wrong choice", "Show a time zone");
    await writeFile(component, edited);
    expect(await generateComponent(root, "weather", "AstroSun")).toEqual({
      written: [],
      skipped: [`${pack}/components/AstroSun.tsx`],
    });
    expect(await readFile(component, "utf8")).toBe(edited);
    expect(await readFile(door, "utf8")).toBe('export * as AstroSun from "./AstroSun";\n');
  });
});

it("keeps handwritten auxiliary files, and extends rather than replacing existing pack doors", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    await put(root, doc, await readFile(join(workspace, doc), "utf8"));
    const pack = "packages/ui/src/packs/weather";
    const oldDoor = 'export { pack } from "./pack";\n';
    const copy = "export const label = () => 'custom';\n";
    await put(root, `${pack}/copy/AstroSun.ts`, copy);
    await put(root, `${pack}/index.ts`, oldDoor);
    expect((await generateComponent(root, "weather", "AstroSun")).skipped).toEqual([
      "src/packs/weather/copy/AstroSun.ts",
    ]);
    expect(await readFile(join(root, pack, "copy/AstroSun.ts"), "utf8")).toBe(copy);
    expect(await readFile(join(root, pack, "index.ts"), "utf8")).toBe(
      `${oldDoor}export { AstroSun } from "./components";\n`,
    );
  });
});

it("does not create files for invalid identifiers or an unsupported declaration", async () => {
  await inFixture(async (root) => {
    const doc = "docs/catalog/packs/weather.md";
    const source = await readFile(join(workspace, doc), "utf8");
    await put(root, doc, source.replace("`lat` number -90–90", "`lat` text without a limit"));
    await expect(generateComponent(root, "weather", "../AstroSun")).rejects.toThrow("Usage");
    await expect(generateComponent(root, "../weather", "AstroSun")).rejects.toThrow("Usage");
    await expect(generateComponent(root, "weather", "NoSuchComponent")).rejects.toThrow("No catalog section");
    await expect(generateComponent(root, "weather", "AstroSun")).rejects.toThrow("Unsupported field `lat`");
    expect(await readdir(root)).toEqual(["docs"]);
  });
});
