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

const { props, meta, examples, fallback, probes } = components.Segmented;
const options = [{ label: "Today" }, { label: "Week" }];

describe("Segmented examples", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to the first view and trims labels", () => {
    expect(props.parse({ options: [{ label: "  Today  " }, { label: " Week " }] })).toEqual({
      options,
      at: 0,
    });
  });
});

describe("Segmented schema", () => {
  it.each([
    {},
    { options: [] },
    { options: [{ label: "Today" }] },
    { options: Array.from({ length: 5 }, () => ({ label: "Today" })) },
    { options: ["Today", "Week"] },
    { options: [{ label: "" }, { label: "Week" }] },
    { options: [{ label: "   " }, { label: "Week" }] },
    { options: [{ label: "a".repeat(15) }, { label: "Week" }] },
    { options, at: -1 },
    { options, at: 0.5 },
    { options, at: 2 },
    { options, at: "0" },
    { options, at: null },
    { options, at: NaN },
    { options, at: Infinity },
    { options, style: "pills" },
    { options, color: "red" },
    { options, pixels: 4 },
    { options: [{ label: "Today", color: "red" }, { label: "Week" }] },
    { options: [{ label: "Today", goto: "today" }, { label: "Week" }] },
    { options: [{ label: "Today", id: "r1" }, { label: "Week" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([2, 3, 4])("accepts every valid index for %i options and rejects the next", (count) => {
    const options = Array.from({ length: count }, () => ({ label: "a".repeat(14) }));
    for (let at = 0; at < count; at++) expect(props.safeParse({ options, at }).success).toBe(true);
    expect(props.safeParse({ options, at: count }).success).toBe(false);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["options"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["options"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["at"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(stampItemIds(meta, props.parse({ options })).options).toEqual([
      { label: "Today", id: "r1" },
      { label: "Week", id: "r2" },
    ]);
  });
});

describe("Segmented fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "view", fields: ["caption"] }],
      items: [
        { id: "list", type: "view", sample: true, caption: "List" },
        { id: "calendar", type: "view", sample: true, caption: "Calendar" },
      ],
    },
    {
      things: [{ type: "view", fields: ["caption"] }],
      items: [{ id: "list", type: "view", sample: false, caption: "List" }],
    },
    {
      things: [{ type: "view", fields: ["caption"] }],
      items: [
        { id: "bad", type: "view", sample: true, caption: 4 },
        { id: "blank", type: "view", sample: true, caption: "   " },
      ],
    },
    {
      things: [{ type: "view", fields: ["caption"] }],
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `view_${index}`,
        type: "view",
        sample: false,
        caption: "x".repeat(80),
      })),
    },
    {
      things: [],
      items: [
        { id: "view", type: "view", sample: true, caption: "List" },
        { id: "other", type: "other", sample: true, caption: "Calendar" },
      ],
    },
  ];
  it.each(casts)("validates empty, matching, partial, malformed and mixed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses shared neutral placeholders with no usable cast content", () => {
    const neutral = { options: [{ label: "Item one" }, { label: "Item two" }], at: 0 };
    expect(fallback({ cast: casts[0]! })).toEqual(neutral);
    expect(fallback({ cast: casts[3]! })).toEqual(neutral);
  });
  it("uses declared cast fields, clips labels and fills a missing second option", () => {
    expect(fallback({ cast: casts[1]! })).toEqual({
      options: [{ label: "List" }, { label: "Calendar" }],
      at: 0,
    });
    expect(fallback({ cast: casts[2]! }).options).toEqual([{ label: "List" }, { label: "Item two" }]);
    expect(fallback({ cast: casts[4]! }).options).toEqual([
      { label: "x".repeat(14) },
      { label: "x".repeat(14) },
    ]);
    expect(fallback({ cast: casts[5]! }).options).toEqual([{ label: "List" }, { label: "Item two" }]);
  });
});

describe("Segmented metadata and probes", () => {
  it("declares its exact parts, state, selection action and nearest wrong choices", () => {
    expect(meta).toMatchObject({
      group: "input",
      region: "top",
      weight: 1,
      tier: "phone",
      items: { key: "options", parts: ["root", "label"] },
      parts: ["root"],
      states: ["filled"],
      actions: { items: { root: ["select"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Chips");
    expect(meta.pick).toContain("TabBar");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Chips")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Segmented" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Show the week",
      expect: { address: "s1/r2", action: "select" },
    });
  });
  it.each(examples)("offers exactly one selection action per option", (example) => {
    const input = stampItemIds(meta, props.parse(example));
    expect(affordancesOf(meta, input, "s1")).toEqual(
      example.options.map((_, index) => ({
        address: `s1/r${index + 1}`,
        part: "root",
        action: "select",
        detail: "",
      })),
    );
    const read = readComponent(components.Segmented, example, "s1").join("\n");
    for (const option of example.options) expect(read).toContain(option.label);
    expect(read).toContain("[s1/r2 select]");
  });
  it("is discovered automatically and resolves its aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Segmented");
    expect(registry.schema("Segmented")).toBe(props);
    expect(registry.resolve("VIEW-SWITCH")).toBe("Segmented");
    expect(registry.resolve("view_picker")).toBe("Segmented");
  });
});
