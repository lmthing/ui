import { expect, it } from "vitest";
import {
  components,
  checkScreen,
  createRegistry,
  parseItemProps,
  stampIds,
  stampIdsWithCounters,
  stampItemIds,
  writerFormatFor,
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

it("keeps the first valid id and reserves later host ids before filling gaps", () => {
  const input = {
    legacy: [{}, { id: "r1" }, { id: "r1" }, { id: "r04" }, { id: "r_a_bad" }, { id: "r2" }],
    first: [{ key: "one" }, { key: "two", id: "r_a_one" }, { key: "three", id: "r_b_wrong" }, { key: 1 }],
  };
  const stamped = stampItemIds(meta, input);
  expect(stamped.legacy.map((row) => row.id)).toEqual(["r6", "r1", "r3", "r4", "r5", "r2"]);
  expect(stamped.first.map((row) => row.id)).toEqual(["r_a_2", "r_a_one", "r_a_three", "r_a_1"]);
  expect(stampItemIds(meta, stamped)).toEqual(stamped);
  expect(input.legacy[0]).toEqual({});
});

it("accepts view ids without widening strict Writer schemas or touching domain ids", () => {
  const list = components.List;
  const input = { rows: [{ id: "r7", title: "Example row" }] };
  expect(list.props.safeParse(input).success).toBe(false);
  expect(JSON.stringify(writerFormatFor(list).json_schema.schema)).not.toContain('"id"');
  expect(parseItemProps(list, input).rows).toMatchObject([{ id: "r7", title: "Example row" }]);
  expect(() => parseItemProps(list, { rows: [{ ...input.rows[0], unknown: true }] })).toThrow(/unknown/);

  const roster = components.ClassRoster;
  const example = roster.examples[0]!;
  const domain = { ...example, attendees: [{ ...example.attendees[0]!, id: "r7" }] };
  expect(roster.props.parse(domain).attendees[0]?.id).toBe("r7");
  expect(parseItemProps(roster, domain).attendees).toMatchObject([{ id: "r1" }]);
  expect(parseItemProps(roster, example).attendees).toMatchObject([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
});

it("keeps the source row's id when the schema sorts the collection", () => {
  const Entries = components.Entries;
  const day = { tags: [], goto: "detail" };
  const entries = [
    { ...day, date: "2026-10-01", text: "Lorem ipsum", id: "r17" },
    { ...day, date: "2026-10-02", text: "Latest", id: "r17" },
    { ...day, date: "2026-10-03", text: "Other", id: "r1" },
  ];
  expect(parseItemProps(Entries, { entries }).entries).toMatchObject([
    { text: "Other", id: "r1" },
    { text: "Latest", id: "r2" },
    { text: "Lorem ipsum", id: "r17" },
  ]);
  expect(
    checkScreen(
      { id: "home", components: [{ id: "e1", c: "Entries", entries }] },
      { Entries },
      { hostItemIds: true },
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "S.placeholder", address: "home/e1/r17/text" }),
      expect.objectContaining({ code: "R2.strip", address: "home/e1/r2/root" }),
    ]),
  );
});

it("reserves saved ids and allocates unique component ids across components with the same prefix", () => {
  const registry = createRegistry({ includeDrafts: true });
  const input = [
    { c: "Actions" },
    { c: "Amount", id: "a2" },
    { c: "Amount", id: "a2" },
    { c: "List", rows: [{ title: "Item" }] },
  ];
  expect(stampIds(input, registry)).toMatchObject([
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
