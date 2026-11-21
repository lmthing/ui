import { afterEach, expect, it } from "vitest";
import { build } from "esbuild";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { packIds } from "../../../src/catalog";
import { checkRules } from "../../rules";
import { generateEntries } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function put(root: string, path: string, source: string) {
  const file = join(root, "src", path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, source);
}

const component = (name: string) => `
import { z } from "zod";
export const meta = { id: "${name}", status: "ready" };
export const props = z.object({});
export const fallback = () => ({});
export const examples = [{}];
export const probes = [];
export function ${name}() { return null; }
`;

async function scaffold(root: string, id: string) {
  const names = ["First", "Second"].map((suffix) => id[0]!.toUpperCase() + id.slice(1) + suffix);
  for (const name of names) await put(root, `packs/${id}/components/${name}.tsx`, component(name));
  await put(
    root,
    `packs/${id}/components/index.ts`,
    names.map((name) => `export * as ${name} from "./${name}";`).join("\n"),
  );
  await put(root, `packs/${id}/pack.ts`, `export const pack = { id: "${id}", probes: [] };`);
  for (const name of ["detail", "overview"])
    await put(root, `packs/${id}/archetypes/${name}.ts`, `export const ${name} = { id: "${name}" };`);
  await put(
    root,
    `packs/${id}/archetypes/index.ts`,
    'export { detail } from "./detail";\nexport { overview } from "./overview";',
  );
  const example = names.map((name) => JSON.stringify({ c: name })).join("\n") + "\n";
  await put(root, `packs/${id}/example.jsonl`, example);
  await put(
    root,
    `packs/${id}/index.ts`,
    `export { pack } from "./pack";\nexport * from "./components";\nexport * from "./archetypes";\nexport const example = ${JSON.stringify(example)};`,
  );
  return names;
}

async function auditEntries(
  folder: string,
  metrics: { maxLines: number; maxFiles: number },
): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  metrics.maxFiles = Math.max(metrics.maxFiles, entries.length);
  expect(entries.length, folder).toBeLessThanOrEqual(12);
  const files: string[] = [];
  for (const entry of entries) {
    const file = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...(await auditEntries(file, metrics)));
    else {
      files.push(file);
      const source = await readFile(file, "utf8");
      const lines = source.trimEnd().split("\n").length;
      metrics.maxLines = Math.max(metrics.maxLines, lines);
      expect(lines, file).toBeLessThanOrEqual(200);
      for (const match of source.matchAll(/from "([^"]*\/packs\/[^"]+)"/g))
        expect(match[1], file).toMatch(/^(?:\.\.\/)+packs\/[a-z]+$/);
    }
  }
  return files;
}

async function loadEntry(root: string, name: string) {
  const result = await build({
    entryPoints: [join(root, "src/entry", `${name}.ts`)],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.text).toString("base64")}`);
}

async function expectCompactTypes(root: string) {
  const source = async (entry: string) =>
    (await readFile(join(root, "src/entry", entry), "utf8")).replace(/\s+/g, " ");
  const catalog = await source("catalog.ts");
  expect(catalog).toContain(
    "export const components: typeof coreComponents & typeof packComponents & typeof surfaceComponents",
  );
  expect(catalog).toContain("export type ComponentName = keyof typeof components;");
  expect(catalog).toContain("ReturnType<typeof registryOf<typeof components>>");
  const groups = Array.from(
    { length: Math.ceil(packIds.length / 9) },
    (_, i) => `typeof group${i + 1}.components`,
  );
  expect((await source("packs/index.ts")).replace("components: & ", "components: ")).toContain(
    `export const components: ${groups.join(" & ")} =`,
  );
  expect(await source("packs/group-1/index.ts")).toMatch(
    /export const components: [^=]*typeof booking\.components & typeof books\.components/,
  );
}

it("keeps all generated files and doors bounded with 45 core components and all registered packs", async () => {
  const root = await mkdtemp(resolve(".entries-scale-test-"));
  roots.push(root);
  await put(root, "catalog/index.ts", `export * from ${JSON.stringify(resolve("src/catalog/index.ts"))};`);
  const coreNames = Array.from({ length: 45 }, (_, i) => `Core${i + 1}`).sort();
  for (const name of coreNames) await put(root, `components/${name}.tsx`, component(name));
  const names: string[] = [];
  for (const id of [...packIds].sort()) names.push(...(await scaffold(root, id)));
  await put(root, "surfaces/Surface.tsx", component("Surface"));
  await generateEntries(root);
  const metrics = { maxLines: 0, maxFiles: 0 };
  const files = await auditEntries(join(root, "src/entry"), metrics);
  expect(files.filter((file) => /group-\d+\/(?!index)[a-z]+\.ts$/.test(file))).toHaveLength(packIds.length);
  expect(await checkRules(root)).toEqual([]);
  await expectCompactTypes(root);
  const catalog = await loadEntry(root, "catalog");
  expect(Object.keys(catalog.components)).toEqual([...coreNames, ...names, "Surface"]);
  expect(Object.keys(catalog.packs)).toEqual([...packIds].sort());
  expect(Object.keys(catalog.packOf)).toEqual(names);
  expect(Object.keys(catalog.packExamples)).toEqual([...packIds].sort());
  for (const id of packIds) {
    expect(catalog.packArchetypes[id].map(({ id }: { id: string }) => id)).toEqual(["detail", "overview"]);
    expect(catalog.packExamples[id]).toBe(
      await readFile(join(root, "src/packs", id, "example.jsonl"), "utf8"),
    );
  }
  const kit = await loadEntry(root, "renderers");
  expect(Object.keys(kit.renderers)).toEqual([...coreNames, ...names, "Surface"]);
  console.info(
    `${packIds.length}-pack fixture: ${metrics.maxLines} maximum lines, ${metrics.maxFiles} maximum folder entries.`,
  );
}, 30000);

it("names the missing root door when a third pack is scaffolded", async () => {
  const root = await mkdtemp(resolve(".entries-scale-test-"));
  roots.push(root);
  for (const id of ["booking", "customers", "health"]) await scaffold(root, id);
  const door = join(root, "src/packs/health/index.ts");
  await rm(door);
  await expect(generateEntries(root)).rejects.toThrow(`Missing pack door: ${door}`);
});

it("exposes authored compose probes by pack through a named door re-export", async () => {
  const root = await mkdtemp(resolve(".entries-scale-test-"));
  roots.push(root);
  await put(root, "catalog/index.ts", `export * from ${JSON.stringify(resolve("src/catalog/index.ts"))};`);
  await scaffold(root, "booking");
  await scaffold(root, "health");
  const probe = { kind: "compose", archetype: "detail", layout: "plain", brief: "Show a visit." };
  await put(
    root,
    "packs/booking/archetypes/detail.ts",
    `export const detail = { id: "detail" }; export const probes = ${JSON.stringify([probe])};`,
  );
  await put(
    root,
    "packs/booking/archetypes/index.ts",
    'export { detail, probes as detailProbes } from "./detail";\nexport { overview } from "./overview";',
  );
  await generateEntries(root);
  expect((await loadEntry(root, "catalog")).packComposeProbes).toEqual({ booking: [probe] });
});

it("prunes obsolete pack files and groups during overlapping rebuilds of a smaller scaffold", async () => {
  const root = await mkdtemp(resolve(".entries-scale-test-"));
  roots.push(root);
  const ids = [...packIds].sort().slice(0, 10);
  const names = await Promise.all(ids.map((id) => scaffold(root, id)));
  await generateEntries(root);
  expect(await readdir(join(root, "src/entry/views"))).toContain("group-2.ts");
  await put(root, "entry/packs/group-1.ts", "// Obsolete flat group\n");
  await rm(join(root, "src/packs", ids[0]!), { recursive: true });
  const rebuildAndRead = async () => {
    await generateEntries(root);
    return Object.keys((await loadEntry(root, "renderers")).renderers);
  };
  const result = { status: "fulfilled", value: names.slice(1).flat() };
  expect(await Promise.allSettled([rebuildAndRead(), rebuildAndRead()])).toEqual([result, result]);
  expect((await readdir(join(root, "src/entry/packs"))).sort()).toEqual(["README.md", "group-1", "index.ts"]);
  expect((await readdir(join(root, "src/entry/packs/group-1"))).sort()).toEqual(
    ["README.md", "index.ts", ...ids.slice(1).map((id) => `${id}.ts`)].sort(),
  );
  expect((await readdir(join(root, "src/entry/views"))).sort()).toEqual([
    "README.md",
    "group-1.ts",
    "index.ts",
  ]);
  expect(await checkRules(root)).toEqual([]);
});
