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
    `import type { PackMeta } from "../../catalog"; export const pack = { id: "booking", example: "./example.jsonl", probes: [] } satisfies PackMeta;`,
  );
  await put(
    "packs/booking/archetypes/visit-detail.ts",
    `export const visitDetail = { id: "visit-detail", job: "Visit", layouts: {}, defaultLayout: "plain" }; export const probes = [];`,
  );
  await put("packs/booking/example.jsonl", example);
  await put("packs/booking/archetypes/index.ts", 'export { visitDetail } from "./visit-detail";\n');
  await put(
    "packs/booking/index.ts",
    `export { pack } from "./pack"; export * from "./components"; export * from "./archetypes"; export const example = ${JSON.stringify(example)};`,
  );
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

it("imports pack data and views only through the root door", async () => {
  const root = await fixture();
  const catalog = await loadCatalog(root);
  expect(catalog.createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toContain("Draft");
  const door = await readFile(join(root, "src/packs/booking/components/index.ts"), "utf8");
  expect(door.trim().split("\n")).toEqual([
    'export * as Draft from "./Draft";',
    'export * as Ready from "./Ready";',
  ]);
  const entry = await readFile(join(root, "src/entry/packs/group-1/booking.ts"), "utf8");
  expect(entry).toContain('from "../../../packs/booking"');
  expect(entry).not.toContain('packs/booking/components"');
  expect(entry).not.toContain('packs/booking/archetypes"');
  const views = await readFile(join(root, "src/entry/views/group-1/index.ts"), "utf8");
  expect(views).toContain('from "../../../packs/booking"');
  expect(views).toContain("Ready: booking.Ready.Ready");
  expect(views).not.toContain("Draft");
  const booking = await readFile(join(root, "src/entry/views/group-1/booking.ts"), "utf8");
  expect(booking).toContain('from "../../../packs/booking"');
  expect(booking).toContain("Ready: pack.Ready.Ready");
  expect(booking).not.toContain("Draft");
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
  expect(Object.keys(catalog.packs.booking)).toEqual(["id", "example", "probes"]);
  expect(catalog.packReady("booking")).toBe(false);
  expect(catalog.buildPackIndex()).toBe("");
  expect(catalog.buildPackIndex({ includeDrafts: true }).split("\n")).toHaveLength(57);
  expect(catalog.packArchetypes.booking[0].id).toBe("visit-detail");
  expect(catalog.packExamples.booking).toBe('{"c":"Ready"}\n');
  const renderers = await build({
    entryPoints: [join(root, "src/entry/renderers.ts")],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  const views = await import(
    `data:text/javascript;base64,${Buffer.from(renderers.outputFiles[0]!.text).toString("base64")}`
  );
  expect(Object.keys(views.renderers)).toEqual(["Core", "Ready"]);
});

it.each(["direct", "named", "re-export", "aliased re-export"])(
  "generates %s layout override exports through the pack door",
  async (kind) => {
    const root = await fixture();
    const folder = join(root, "src/packs/booking/archetypes");
    const data = `{ journal: { entries: {
      recipe: [{ allow: ["Draft"], required: true }], defaults: [{ id: "draft", c: "Draft" }],
    } } }`;
    let declaration = `export const archetypeOverrides = ${data};`;
    if (kind === "named") declaration = `const archetypeOverrides = ${data}; export { archetypeOverrides };`;
    if (kind.includes("re-export")) {
      const name = kind === "re-export" ? "archetypeOverrides" : "journalLayouts";
      const binding = kind === "re-export" ? name : `${name} as archetypeOverrides`;
      await writeFile(join(folder, "overrides.ts"), `export const ${name} = ${data};`);
      declaration = `export { ${binding} } from "./overrides";`;
    }
    await writeFile(
      join(folder, "index.ts"),
      `export { visitDetail } from "./visit-detail";\n${declaration}`,
    );
    const catalog = await loadCatalog(root);
    expect(catalog.packArchetypeOverrides.booking.journal.entries.recipe[0].allow).toEqual(["Draft"]);
    expect(catalog.packArchetypes.booking.map(({ id }: { id: string }) => id)).toEqual(["visit-detail"]);
    const registry = catalog.createRegistry({ packs: ["booking"], includeDrafts: true });
    expect(registry.archetypes.journal.meta.layouts.entries.slots[0].allow).toEqual(["Draft"]);
    expect(catalog.createRegistry().archetypes.journal.meta).toEqual(catalog.archetypes.journal.meta);
  },
);

it.each([
  ['{"c":"Ready"}\n', true],
  ['{"c":"Ready"}\n{"c":"Missing"}\n', false],
])("wires the ready gate into the generated public catalog for %s", async (example, ready) => {
  const catalog = await loadCatalog(await fixture("ready", example));
  expect(catalog.packReady("booking")).toBe(ready);
  expect(catalog.createRegistry({ packs: ["booking"] }).ids).toEqual(
    ready ? ["Core", "Draft", "Ready"] : ["Core"],
  );
  expect(catalog.buildPackIndex()).toBe(
    ready
      ? "- booking: Offer services and book appointments, classes and free start times. Pick: Booking time with someone: appointments, classes, slots and class waitlists. Booking alone covers clients booking a provider's appointments or studio classes; clients, providers, paid services and class groups do not imply customers, team, commerce, events or community. Add another pack only for an explicitly requested separate job. Not selling goods (commerce). Reply only with a valid JSON array of pack ids, never an object, invented app name or explanation."
      : "",
  );
  expect(catalog.createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toEqual([
    "Core",
    "Draft",
    "Ready",
  ]);
  expect(catalog.buildPackIndex({ includeDrafts: true }).split("\n")).toHaveLength(57);
  expect(catalog.packReady("commerce")).toBe(false);
});

it("regenerates a new scaffold without changing the draft index or Director prompt", async () => {
  const root = await fixture();
  const file = join(root, "src/packs/booking/pack.ts");
  await writeFile(
    file,
    `export const pack = { id: "booking", example: "example.jsonl", probes: [{ kind: "pack", idea: "Book an appointment", expect: ["booking"] }] };`,
  );
  const before = await loadCatalog(root);
  await mkdir(join(root, "src/packs/commerce"), { recursive: true });
  await writeFile(
    join(root, "src/packs/commerce/pack.ts"),
    `export const pack = { id: "commerce", example: "example.jsonl", probes: [] };`,
  );
  await writeFile(join(root, "src/packs/commerce/index.ts"), 'export { pack } from "./pack";\n');
  const after = await loadCatalog(root);
  expect(Object.keys(after.packs)).toEqual(["booking", "commerce"]);
  expect(after.buildPackIndex({ includeDrafts: true })).toBe(before.buildPackIndex({ includeDrafts: true }));
  const prompts: string[] = [];
  for (const catalog of [before, after])
    await catalog.runPackProbes({
      packs: catalog.packs,
      only: ["booking"],
      callModel: async (prompt: string) => {
        prompts.push(prompt);
        return '["booking"]';
      },
    });
  expect(prompts).toHaveLength(2);
  expect(prompts[1]).toBe(prompts[0]);
});
