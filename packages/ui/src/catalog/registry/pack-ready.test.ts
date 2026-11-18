import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition, PackMeta } from "..";
import { packReady, registryOf, type PackReadyInput } from "./index";

const definition = (id: string, status: Definition["meta"]["status"] = "ready"): Definition => ({
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
  examples: [],
  fallback: () => ({ title: "Items" }),
  probes: [],
});
const pack: PackMeta = {
  id: "booking",
  name: "Booking",
  purpose: "Time",
  pick: "Not commerce",
  example: "example.jsonl",
  probes: [],
};
const fixture = (): PackReadyInput => ({
  components: { Core: definition("Core"), First: definition("First"), Second: definition("Second") },
  packOf: { First: "booking", Second: "booking" },
  packs: { booking: pack },
  packExamples: { booking: '{"c":"First","id":"first","title":"Items"}\n{"c":"Core","title":"Summary"}' },
});

it("loads the whole ready pack and preserves its input data", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  expect(packReady("booking", input)).toBe(true);
  const registry = registryOf(input.components, { packs: ["booking"] }, input.packOf, (id) =>
    packReady(id, input),
  );
  expect(registry.ids).toEqual(["Core", "First", "Second"]);
  expect(JSON.stringify(input)).toBe(before);
});

it.each(["draft", undefined] as const)("rejects a component with status %s", (status) => {
  const input = fixture();
  const def = definition("Second");
  const { status: _status, ...meta } = def.meta;
  input.components = {
    ...input.components,
    Second: {
      ...def,
      meta: status ? { ...meta, status } : meta,
    },
  };
  expect(packReady("booking", input)).toBe(false);
  const ready = (id: PackMeta["id"]) => packReady(id, input);
  const live = registryOf(input.components, { packs: ["booking"] }, input.packOf, ready);
  expect(live.ids).toEqual(["Core"]);
  expect(live.defs.map((def) => def.meta.id)).toEqual(["Core"]);
  for (const id of ["First", "Second"]) {
    expect(live.get(id)).toBeUndefined();
    expect(live.schema(id)).toBeUndefined();
    expect(live.resolve(id)).toBeUndefined();
  }
  expect(
    registryOf(input.components, { packs: ["booking"], includeDrafts: true }, input.packOf, ready).ids,
  ).toEqual(["Core", "First", "Second"]);
});

it.each([
  "",
  " \r\n ",
  "broken",
  "null",
  "[]",
  '{"c":"Unknown","title":"Items"}',
  '{"c":"First","title":3}',
  '{"c":"First","title":"Items","extra":true}',
  '{"c":"First","title":"Items"}\n{"c":"Second","title":3}',
])("rejects invalid or empty examples: %s", (example) => {
  const input = { ...fixture(), packExamples: { booking: example } };
  expect(packReady("booking", input)).toBe(false);
  expect(
    registryOf(input.components, { packs: ["booking"] }, input.packOf, (id) => packReady(id, input)).ids,
  ).toEqual(["Core"]);
});

it("requires pack metadata, components and an example file", () => {
  const input = fixture();
  expect(packReady("booking", { ...input, packs: {} })).toBe(false);
  expect(packReady("booking", { ...input, packOf: {} })).toBe(false);
  expect(packReady("booking", { ...input, components: {} })).toBe(false);
  expect(packReady("booking", { ...input, packExamples: {} })).toBe(false);
  expect(packReady("booking", { ...input, packs: { booking: { ...pack, example: "" } } })).toBe(false);
});

it("accepts blank separators, CRLF and scoped resolution, not other packs or core drafts", () => {
  const input = fixture();
  const example = (c: string) => ({ booking: `\r\n{"c":"${c}","title":"Items"}\r\n\r\n` });
  expect(packReady("booking", { ...input, packExamples: example("f_i-rst") })).toBe(true);
  input.components = { ...input.components, Other: definition("Other"), Draft: definition("Draft", "draft") };
  input.packOf = { ...input.packOf, Other: "commerce" };
  expect(packReady("booking", { ...input, packExamples: example("Other") })).toBe(false);
  expect(packReady("booking", { ...input, packExamples: example("Draft") })).toBe(false);
});
