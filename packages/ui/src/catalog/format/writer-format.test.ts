import { expect, it } from "vitest";
import { z } from "zod";
import { packReady } from "../registry";
import {
  components,
  buildEntry,
  createRegistry,
  registryOf,
  writerFormat,
  writerFormatFor,
  estimateTokens,
  type PackId,
  type JsonSchema,
  type Definition,
  type PackReadyInput,
} from "@lmthing/ui/catalog";

const core = createRegistry({ includeDrafts: true });
// These fixtures read definitions uniformly; don't spread the union of every catalog schema.
const coreDefs: readonly Definition[] = core.defs;

it("keeps presentation fields out of core and pack Writer formats and prompt entries", () => {
  const defs: readonly Definition[] = Object.values(components);
  for (const def of defs) {
    if (def.meta.codeOwned) continue;
    const { properties } = writerFormatFor(def).json_schema.schema;
    for (const key of ["density", "surface", "bleed", "align"]) {
      expect(def.meta.variants ?? {}, def.meta.id).not.toHaveProperty(key);
      expect(properties, def.meta.id).not.toHaveProperty(key);
      expect(buildEntry(def), def.meta.id).not.toMatch(new RegExp(`\\b${key}\\b`, "i"));
    }
  }
  expect(writerFormatFor(components.List).json_schema.schema.properties).toHaveProperty("detail");
  expect(writerFormatFor(components.Progress).json_schema.schema.properties).toHaveProperty("emphasis");
});

function checkObjects(schema: JsonSchema) {
  if (schema.properties) {
    expect(schema.additionalProperties).toBe(false);
    for (const key of ["density", "surface", "bleed", "align"])
      expect(schema.properties).not.toHaveProperty(key);
    expect(schema.required).toEqual(Object.keys(schema.properties));
    Object.values(schema.properties).forEach(checkObjects);
  }
  schema.anyOf?.forEach(checkObjects);
  if (schema.items) checkObjects(schema.items);
}
it("includes one const/enum branch per writable registry id, generated from Zod inputs", () => {
  const format = writerFormat(core),
    branches = format.json_schema.schema.anyOf!;
  expect(format.type).toBe("json_schema");
  expect(format.json_schema.strict).toBe(true);
  expect(branches.map((branch) => branch.properties?.c?.const)).toEqual(
    coreDefs.filter((def) => !def.meta.codeOwned).map((def) => def.meta.id),
  );
  expect(branches).toHaveLength(50);
  expect(branches.map((branch) => branch.properties?.c?.const)).not.toContain("Ring");
  checkObjects(format.json_schema.schema);
  const line = writerFormatFor(components.List).json_schema.schema;
  expect(line.properties?.c).toEqual({ type: "string", const: "List", enum: ["List"] });
  expect(line.properties?.rows).toMatchObject({ type: "array", minItems: 1, maxItems: 6 });
  expect(() => writerFormatFor(components.TabBar)).toThrow("code-owned");
  expect(() => writerFormat({ ids: [], defs: [] })).toThrow("no writable");
});
it("exports auth components and bounds through the scoped Writer format", () => {
  const branches = writerFormat(core).json_schema.schema.anyOf!;
  const field = branches.find(({ properties }) => properties?.c?.const === "Field")!.properties!;
  expect(field.kind?.anyOf?.[0]?.enum).toEqual(
    expect.arrayContaining(["email", "password", "code", "phone"]),
  );
  expect(field.length?.anyOf?.[0]).toMatchObject({ type: "integer", minimum: 4, maximum: 8 });
  const options = branches.find(({ properties }) => properties?.c?.const === "SignInOptions")!.properties!;
  expect(options.items).toMatchObject({
    minItems: 1,
    maxItems: 4,
    items: { properties: { provider: { enum: ["apple", "google", "email", "phone"] } } },
  });
});
it("writes the reported receipt phase and offset timestamp without exposing derived link flags", () => {
  const line = writerFormatFor(components.HandoffReceipt).json_schema.schema;
  expect(line.properties?.phase?.enum).toEqual(["waiting", "received", "returned"]);
  expect(line.properties?.at?.anyOf?.[0]).toMatchObject({ type: "string", pattern: expect.any(String) });
  expect(line.properties?.at?.anyOf?.[0]).not.toHaveProperty("format");
  expect(line.properties).not.toHaveProperty("linked");
});
it.each(["booking", "customers", "money", "places"] satisfies PackId[])(
  "scopes and measures core plus the existing ten-entry %s fixture",
  (pack) => {
    const fixture = Object.fromEntries(
      coreDefs
        .filter((def) => !def.meta.codeOwned)
        .slice(0, 10)
        .map((def, i) => [`${pack}${i}`, { ...def, meta: { ...def.meta, id: `${pack}${i}` } }]),
    );
    const packOf = Object.fromEntries(Object.keys(fixture).map((id) => [id, pack]));
    const defs = { ...Object.fromEntries(coreDefs.map((def) => [def.meta.id, def])), ...fixture };
    const absent = writerFormat(registryOf(defs, { includeDrafts: true }, packOf));
    const included = writerFormat(registryOf(defs, { packs: [pack], includeDrafts: true }, packOf));
    expect(absent.json_schema.schema.anyOf).toHaveLength(50);
    expect(included.json_schema.schema.anyOf).toHaveLength(60);
    const text = JSON.stringify(included.json_schema.schema);
    expect(estimateTokens(text)).toBe(Math.ceil(Array.from(text).length / 4));
    expect(text.length).toBeGreaterThan(JSON.stringify(absent.json_schema.schema).length);
  },
);
it("trusts ids rather than extra definitions and rejects missing ids", () => {
  expect(writerFormat({ ids: ["List"], defs: coreDefs }).json_schema.schema.anyOf).toHaveLength(1);
  expect(() => writerFormat({ ids: ["Missing"], defs: coreDefs })).toThrow("No definition");
});

it("omits every unready pack id from Writer enums and includes drafts on request", () => {
  const make = (id: string, status: "ready" | "draft"): Definition => ({
    meta: {
      id,
      status,
      group: "content",
      purpose: "Items",
      pick: "Not details",
      region: "body",
      weight: 2,
      tier: "phone",
      realPath: "Local data",
    },
    props: z.strictObject({ title: z.string() }),
    fallback: () => ({ title: "Items" }),
    examples: [],
    probes: [],
  });
  const input: PackReadyInput = {
    components: {
      Core: make("Core", "ready"),
      First: make("First", "ready"),
      Second: make("Second", "draft"),
    },
    packOf: { First: "booking", Second: "booking" },
    packs: {
      booking: {
        id: "booking",
        example: "example.jsonl",
        probes: [],
      },
    },
    packExamples: { booking: '{"c":"First","title":"Items"}' },
  };
  const enums = (includeDrafts: boolean) =>
    writerFormat(
      registryOf(input.components, { packs: ["booking"], includeDrafts }, input.packOf, (id) =>
        packReady(id, input),
      ),
    ).json_schema.schema.anyOf!.flatMap((branch) => branch.properties!.c!.enum!);
  expect(enums(false)).toEqual(["Core"]);
  expect(enums(true)).toEqual(["Core", "First", "Second"]);
  input.components = { ...input.components, Second: make("Second", "ready") };
  expect(enums(false)).toEqual(["Core", "First", "Second"]);
  input.packExamples = { booking: '{"c":"First","title":3}' };
  expect(enums(false)).toEqual(["Core"]);
});
