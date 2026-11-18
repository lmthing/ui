import { afterEach, expect, it } from "vitest";
import { build } from "esbuild";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { generateEntries } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
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
    export const meta = { id: "${name}", status: "${status}", aliases: [] };
    export const props = z.object({});
    export const fallback = () => ({});
    export const examples = [{}];
    export const probes = [];
    ${status === "ready" ? `export function ${name}() { return null; }` : ""}`;
  await put("components/Core.tsx", component("Core", "ready"));
  await put("packs/booking/components/Draft.tsx", component("Draft", "draft"));
  await put("packs/booking/components/Ready.tsx", component("Ready", "ready"));
  await put(
    "packs/booking/pack.ts",
    `import type { PackMeta } from "../../catalog"; export const pack = { id: "booking", name: "Booking", purpose: "Time", pick: "Time", example: "./example.jsonl", probes: [] } satisfies PackMeta;`,
  );
  await put(
    "packs/booking/archetypes/visit-detail.ts",
    `export const visitDetail = { id: "visit-detail", job: "Visit", layouts: {}, defaultLayout: "plain" }; export const probes = [];`,
  );
  await put("packs/booking/example.jsonl", '{"app":"visit"}\n');
  return root;
}

it("generates scoped drafts, ready renderers, pack data and inlined examples", async () => {
  const root = await fixture();
  await generateEntries(root);
  const result = await build({
    entryPoints: [join(root, "src/entry/catalog.ts")],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
  });
  const catalog = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.text).toString("base64")}`
  );
  expect(Object.keys(catalog.components)).toEqual(["Core", "Draft", "Ready"]);
  expect(catalog.packOf).toEqual({ Draft: "booking", Ready: "booking" });
  for (const [options, ids] of [
    [{}, ["Core"]],
    [{ includeDrafts: true }, ["Core"]],
    [{ packs: ["booking"] }, ["Core", "Ready"]],
    [{ packs: ["booking"], includeDrafts: true }, ["Core", "Draft", "Ready"]],
  ])
    expect(catalog.createRegistry(options).ids).toEqual(ids);
  expect(catalog.packs.booking.id).toBe("booking");
  expect(catalog.packArchetypes.booking[0].id).toBe("visit-detail");
  expect(catalog.packExamples.booking).toBe('{"app":"visit"}\n');
  const renderers = await readFile(join(root, "src/entry/renderers.ts"), "utf8");
  expect(renderers).toContain("{ Core, Ready }");
  expect(renderers).not.toContain("Draft");
});
