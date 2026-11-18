import { afterEach, expect, it } from "vitest";
import { build } from "esbuild";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { generateEntries } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(status = "draft", example = '{"c":"Ready"}\n') {
  const root = await mkdtemp(resolve(".entries-test-"));
  roots.push(root);
  async function put(path: string, source: string) {
    const file = join(root, "src", path);
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, source);
  }
  await put("catalog/index.ts", `export * from ${JSON.stringify(resolve("src/catalog/index.ts"))};`);
  const component = (name: string, status: string) => `
    import { z } from "zod";
    export const meta = { id: "${name}", status: "${status}" };
    export const props = z.object({});
    export const fallback = () => ({});
    export const examples = [{}];
    export const probes = [];
    ${status === "ready" ? `export function ${name}() { return null; }` : ""}`;
  await put("components/Core.tsx", component("Core", "ready"));
  await put("packs/booking/components/Draft.tsx", component("Draft", status));
  await put("packs/booking/components/Ready.tsx", component("Ready", "ready"));
  await put(
    "packs/booking/pack.ts",
    `import type { PackMeta } from "../../catalog"; export const pack = { id: "booking", name: "Booking", purpose: "Time", pick: "Time", example: "./example.jsonl", probes: [] } satisfies PackMeta;`,
  );
  await put(
    "packs/booking/archetypes/visit-detail.ts",
    `export const visitDetail = { id: "visit-detail", job: "Visit", layouts: {}, defaultLayout: "plain" }; export const probes = [];`,
  );
  await put("packs/booking/example.jsonl", example);
  return root;
}

async function loadCatalog(root: string) {
  await generateEntries(root);
  const result = await build({
    entryPoints: [join(root, "src/entry/catalog.ts")],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.text).toString("base64")}`);
}

it("uses pack component and archetype doors when present", async () => {
  const root = await fixture();
  await writeFile(
    join(root, "src/packs/booking/components/index.ts"),
    'export * as Draft from "./Draft";\nexport * as Ready from "./Ready";\n',
  );
  await writeFile(
    join(root, "src/packs/booking/archetypes/index.ts"),
    'export { visitDetail } from "./visit-detail";\n',
  );
  const catalog = await loadCatalog(root);
  expect(catalog.createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toContain("Draft");
  const entry = await readFile(join(root, "src/entry/catalog.ts"), "utf8");
  expect(entry).toContain('import { Ready } from "../packs/booking/components"');
  expect(entry).toContain('from "../packs/booking/archetypes"');
  const renderers = await readFile(join(root, "src/entry/renderers.ts"), "utf8");
  expect(renderers).toContain("const Ready = ReadyDefinition.Ready");
});

it("generates scoped drafts, ready renderers, pack data and inlined examples", async () => {
  const root = await fixture();
  const catalog = await loadCatalog(root);
  expect(Object.keys(catalog.components)).toEqual(["Core", "Draft", "Ready"]);
  expect(catalog.packOf).toEqual({ Draft: "booking", Ready: "booking" });
  for (const [options, ids] of [
    [{}, ["Core"]],
    [{ includeDrafts: true }, ["Core"]],
    [{ packs: ["booking"] }, ["Core"]],
    [{ packs: ["booking"], includeDrafts: true }, ["Core", "Draft", "Ready"]],
  ])
    expect(catalog.createRegistry(options).ids).toEqual(ids);
  expect(catalog.packs.booking.id).toBe("booking");
  expect(catalog.packReady("booking")).toBe(false);
  expect(catalog.buildPackIndex()).toBe("");
  expect(catalog.buildPackIndex({ includeDrafts: true })).toBe("- booking: Time Pick: Time");
  expect(catalog.packArchetypes.booking[0].id).toBe("visit-detail");
  expect(catalog.packExamples.booking).toBe('{"c":"Ready"}\n');
  const renderers = await readFile(join(root, "src/entry/renderers.ts"), "utf8");
  expect(renderers).toContain("{ Core, Ready }");
  expect(renderers).not.toContain("Draft");
});

it.each([
  ['{"c":"Ready"}\n', true],
  ['{"c":"Ready"}\n{"c":"Missing"}\n', false],
])("wires the ready gate into the generated public catalog for %s", async (example, ready) => {
  const catalog = await loadCatalog(await fixture("ready", example));
  expect(catalog.packReady("booking")).toBe(ready);
  expect(catalog.createRegistry({ packs: ["booking"] }).ids).toEqual(
    ready ? ["Core", "Draft", "Ready"] : ["Core"],
  );
  expect(catalog.buildPackIndex()).toBe(ready ? "- booking: Time Pick: Time" : "");
  expect(catalog.createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toEqual([
    "Core",
    "Draft",
    "Ready",
  ]);
  expect(catalog.buildPackIndex({ includeDrafts: true })).toBe("- booking: Time Pick: Time");
  expect(catalog.packReady("commerce")).toBe(false);
});
