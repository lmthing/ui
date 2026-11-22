import { expect, it } from "vitest";
import {
  components,
  createRegistry,
  stampIds,
  stampIdsWithCounters,
  stampItemIds,
} from "@lmthing/ui/catalog";
import type { Meta } from "../meta";

const meta = {
  id: "StampFixture",
  group: "data",
  purpose: "Address separate rows.",
  pick: "Fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local.",
  items: { key: "legacy", parts: ["root"] },
  collections: {
    a: { key: "first", prefix: "a", identity: "key", parts: ["root"] },
    b: { key: "second", prefix: "b", identity: "key", parts: ["root"] },
  },
} satisfies Meta;

it("stamps all collections without overwriting the original identity or mutating input", () => {
  const input = { legacy: [{}], first: [{ key: 4 }], second: [{ key: "ref_a" }] };
  expect(stampItemIds(meta, input)).toEqual({
    legacy: [{ id: "r1" }],
    first: [{ key: 4, id: "r_a_4" }],
    second: [{ key: "ref_a", id: "r_b_ref_a" }],
  });
  expect(input.first).toEqual([{ key: 4 }]);
});

it("refuses collisions and malformed identities rather than retargeting an address", () => {
  const duplicate = {
    ...meta,
    collections: { ...meta.collections, b: { ...meta.collections.b, prefix: "a" } },
  };
  expect(() => stampItemIds(duplicate, {})).toThrow(/distinct/);
  expect(() => stampItemIds(meta, { first: [{ key: 1 }, { key: "1" }] })).toThrow(/duplicate/);
  for (const key of ["", "space here", "leading/slash", 0, undefined])
    expect(() => stampItemIds(meta, { first: [{ key }] })).toThrow(/identity/);
});

it("reserves saved ids and allocates unique component ids across components with the same prefix", () => {
  const registry = createRegistry({ includeDrafts: true });
  const input = [
    { c: "Actions" },
    { c: "Amount", id: "a2" },
    { c: "Amount", id: "a2" },
    { c: "List", rows: [{ title: "Item" }] },
  ];
  expect(stampIds(input, registry)).toEqual([
    { c: "Actions", id: "a3" },
    { c: "Amount", id: "a2" },
    { c: "Amount", id: "a4" },
    { c: "List", id: "l1", rows: [{ title: "Item", id: "r1" }] },
  ]);
  expect(input[3]?.rows).toEqual([{ title: "Item" }]);
});

it("treats an oversized suffix as a saved id, not a counter seed", () => {
  const registry = createRegistry();
  const saved = { c: "Header", id: "h9007199254740991" };
  const { components } = stampIdsWithCounters([saved, { c: "Header" }], registry);
  expect(components).toEqual([saved, { c: "Header", id: "h1" }]);
});

it("persists high water marks through serialization and deletion without mutating previous counters", () => {
  const registry = createRegistry({ includeDrafts: true });
  const first = stampIdsWithCounters(
    [{ c: "Actions" }, { c: "List", rows: [{ title: "First" }, { title: "Second" }] }],
    registry,
  );
  const removed = stampIdsWithCounters([], registry, JSON.parse(JSON.stringify(first.counters)));
  const more = stampIdsWithCounters(
    [
      { c: "Amount" },
      { c: "List", id: "l1", rows: [{ title: "Third" }] },
      { c: "List", rows: [{ title: "New list" }] },
    ],
    registry,
    removed.counters,
  );
  expect(more.components.map(({ id }) => id)).toEqual(["a2", "l1", "l2"]);
  expect(more.itemIds).toEqual({ l1: ["r3"], l2: ["r1"] });
  expect(first.counters).toEqual({ components: { a: 1, l: 1 }, items: { l1: 2 } });
});

it("does not confuse a declared row id with its runtime address in a wire snapshot", () => {
  const registry = createRegistry({ packs: ["booking"], includeDrafts: true });
  const example = components.ClassRoster.examples[0]!;
  const stamped = stampIdsWithCounters([{ c: "ClassRoster", ...example }], registry);
  expect(stamped.components).toEqual([{ c: "ClassRoster", id: "c1", ...example }]);
  expect(stamped.itemIds.c1?.[0]).toBe("r1");
});
