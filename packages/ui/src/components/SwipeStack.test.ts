import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.SwipeStack;
const card = { title: "Fern" };
const pair = [card, { title: "Basil" }];

describe("SwipeStack schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text without inventing optional content", () => {
    expect(props.parse({ cards: [{ title: "  Fern  ", meta: "  Shade  " }, card] })).toEqual({
      cards: [{ title: "Fern", meta: "Shade" }, card],
    });
    expect(props.parse({ cards: pair })).toEqual({ cards: pair });
  });
  it("shows how to omit optional detail in the model's first example", () => {
    const cards = props.parse(examples[0]).cards;
    expect(cards[0]).toHaveProperty("meta");
    expect(cards[1]).toHaveProperty("meta");
    expect(cards[2]).toEqual({ title: "Basil" });
    expect(props.safeParse({ cards: [{ title: "Basil", meta: "   " }, card] }).success).toBe(false);
  });
  it.each([
    {},
    { cards: [] },
    { cards: [card] },
    { cards: Array.from({ length: 7 }, () => card) },
    { cards: [{ title: "" }, card] },
    { cards: [{ title: "   " }, card] },
    { cards: [{ title: "a".repeat(33) }, card] },
    { cards: [{ title: "Fern", meta: "a".repeat(25) }, card] },
    { cards: [{ title: "Fern", meta: "" }, card] },
    { cards: [{ title: "Fern", photo: "https://example.org/image.png" }, card] },
    { cards: [{ title: "Fern", photo: `lib:${"a".repeat(65)}` }, card] },
    { cards: [{ title: "Fern", photo: "local:no" }, card] },
    { cards: [{ title: "Fern", id: "r1" }, card] },
    { cards: [{ title: "Fern", color: "red" }, card] },
    { cards: [{ title: "Fern", goto: "fern" }, card] },
    { cards: [{ title: "Fern", root: true }, card] },
    { cards: [{ title: "Fern", $first: true }, card] },
    { cards: pair, style: "grid" },
    { cards: pair, visible: "first" },
    { cards: pair, color: "#fff" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits, both photo forms and the minimum count", () => {
    const largest = { title: "a".repeat(32), meta: "a".repeat(24), photo: "lib:plant" };
    expect(props.safeParse({ cards: Array.from({ length: 6 }, () => largest) }).success).toBe(true);
    expect(props.safeParse({ cards: [{ title: "Fern", photo: "local:1" }, card] }).success).toBe(true);
    expect(props.safeParse({ cards: pair }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["cards"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["cards"][number]["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("SwipeStack fallback and metadata", () => {
  it.each([2, 3, 4, 5, 6])("reads only the first of %i cards and counts the rest", (count) => {
    const cards = Array.from({ length: count }, (_, index) => ({
      title: `Choice ${index}`,
      photo: "lib:plants",
      meta: `Detail ${index}`,
    }));
    expect(readComponent(components.SwipeStack, { cards }, "s1")).toEqual([
      "s1 SwipeStack",
      '  r1 "Choice 0" · photo:plants · "Detail 0" [s1/r1 swipe]',
      `  +${count - 1} more`,
    ]);
  });
  it("reads the new top card after a reorder and no cards when empty", () => {
    expect(readComponent(components.SwipeStack, { cards: [...pair].reverse() }, "s1")).toEqual([
      "s1 SwipeStack",
      '  r1 "Basil" [s1/r1 swipe]',
      "  +1 more",
    ]);
    expect(readComponent(components.SwipeStack, { cards: pair }, "s1", "empty")).toEqual([
      "s1 SwipeStack (empty)",
    ]);
  });
  it.each([2, 3, 6])("offers swipe only on the first of %i cards", (count) => {
    const cards = Array.from({ length: count }, (_, index) => ({ title: `Choice ${index}` }));
    const value = stampItemIds(meta, props.parse({ cards }));
    expect(affordancesOf(meta, value, "s1")).toEqual([
      { address: "s1/r1", part: "root", action: "swipe", detail: "" },
    ]);
  });
  it("keeps the swipe action on the first item after a reorder or replacement", () => {
    const value = stampItemIds(meta, props.parse({ cards: pair }));
    const cards = value.cards as { id: string; title: string }[];
    for (const reordered of [
      [cards[1]!, cards[0]!],
      [cards[1]!, { id: "r3", title: "Aloe" }],
    ]) {
      expect(affordancesOf(meta, { cards: reordered }, "s1")).toEqual([
        { address: "s1/r2", part: "root", action: "swipe", detail: "" },
      ]);
    }
    expect(affordancesOf(meta, { cards: [] }, "s1")).toEqual([]);
  });
});

describe("SwipeStack fallback and metadata", () => {
  it("validates empty, matching, mixed, overlong and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
      },
      {
        things: [],
        items: [
          { id: "dog", type: "dog", sample: true, title: "Clover" },
          { id: "plant", type: "plant", sample: true, name: "Fern" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `plant_${index}`,
          type: "plant",
          sample: false,
          name: "x".repeat(80),
          room: "y".repeat(80),
        })),
      },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).cards).toEqual([{ title: "Item one" }, { title: "Item two" }]);
    expect(fallback({ cast: casts[1]! }).cards).toEqual([
      { title: "Fern", meta: "Bathroom" },
      { title: "Item two" },
    ]);
    expect(fallback({ cast: casts[2]! }).cards[0]).toEqual({ title: "Clover" });
    expect(fallback({ cast: casts[3]! }).cards).toHaveLength(6);
    expect(fallback({ cast: casts[4]! }).cards).toEqual(fallback({ cast: casts[0]! }).cards);
  });
});

describe("SwipeStack fallback and metadata", () => {
  it("has the specified parts, states, tier and well-formed probes", () => {
    expect(meta).toMatchObject({
      group: "content",
      region: "body",
      weight: 3,
      tier: "phone",
      items: { key: "cards", parts: ["root", "photo", "title"], visible: "first" },
      parts: ["root"],
      states: ["filled", "empty"],
      actions: { items: { root: ["swipe"] }, when: { root: { $first: true } } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Gallery");
    expect(meta.pick).toContain("Card");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Gallery")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "SwipeStack" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Skip this one",
      expect: { address: "s1/r1", action: "swipe" },
    });
  });
  it("builds a data-only registry with tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("SwipeStack");
    expect(registry.schema("SwipeStack")).toBe(props);
    expect(registry.resolve("s-w-i-p-e-s-t-a-c-k")).toBe("SwipeStack");
    expect(registry.resolve("s-w-i-p-e-s-t-a-c-k")).toBe("SwipeStack");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
