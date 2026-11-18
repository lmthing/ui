import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import { components, createRegistry, type CastLike, type Props } from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.KeyValue;

describe("KeyValue schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ pairs: [{ label: "  Room  ", value: "  Bathroom  " }] })).toEqual({
      style: "rows",
      pairs: [{ label: "Room", value: "Bathroom" }],
    });
  });
  it.each([
    {},
    { pairs: [] },
    { pairs: Array.from({ length: 7 }, () => ({ label: "Room", value: "Bathroom" })) },
    { pairs: [{ label: "Room" }] },
    { pairs: [{ value: "Bathroom" }] },
    { pairs: [{ label: "", value: "Bathroom" }] },
    { pairs: [{ label: "   ", value: "Bathroom" }] },
    { pairs: [{ label: "Room", value: "" }] },
    { pairs: [{ label: "Room", value: "   " }] },
    { pairs: [{ label: "a".repeat(21), value: "Bathroom" }] },
    { pairs: [{ label: "Room", value: "a".repeat(29) }] },
    { pairs: [{ label: "Room", value: 4 }] },
    { pairs: [{ label: "Room", value: "Bathroom", icon: "unknown" }] },
    { pairs: [{ label: "Room", value: "Bathroom", goto: "bathroom" }] },
    { pairs: [{ label: "Room", value: "Bathroom", pixels: 4 }] },
    { style: "cards", pairs: [{ label: "Room", value: "Bathroom" }] },
    { color: "red", pairs: [{ label: "Room", value: "Bathroom" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and count in both styles", () => {
    const pair = { label: "a".repeat(20), value: "a".repeat(28), icon: "leaf" };
    for (const style of ["rows", "grid"])
      expect(props.safeParse({ style, pairs: Array.from({ length: 6 }, () => pair) }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["pairs"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["pairs"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["pairs"][number]["value"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ pairs: [{ label: "Room", value: "Bathroom", id: "r1" }] }).success).toBe(false);
  });
});

describe("KeyValue fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const seed = { id: "fern", type: "plant", sample: true };
    const long = "x".repeat(80);
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["room", "water_every", "lastWatered"] }],
        items: [
          { ...seed, lastWatered: "Monday", water_every: "7 days", room: "Bathroom" },
          { ...seed, id: "basil", room: "Kitchen" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["room"] }],
        items: [
          { id: "dog", type: "dog", sample: true, room: "Hall" },
          { ...seed, room: "Bathroom" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["name", "room", "light", "water", "notes"] }],
        items: [{ ...seed, name: long, room: long, light: long, water: long, notes: long }],
      },
      {
        things: [{ type: "plant", fields: ["room", "light", "water", "notes"] }],
        items: [{ ...seed, room: 4, light: null, water: " ", notes: {} }],
      },
      { things: [], items: [{ ...seed, room: "Bathroom" }] },
      { things: [{ type: "plant", fields: ["room"] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).pairs).toEqual([
      { label: "Room", value: "Bathroom" },
      { label: "Water every", value: "7 days" },
      { label: "Last Watered", value: "Monday" },
    ]);
    expect(fallback({ cast: casts[2]! }).pairs).toEqual([{ label: "Room", value: "Bathroom" }]);
    expect(fallback({ cast: casts[3]! }).pairs).toHaveLength(4);
    for (const index of [0, 4, 5, 6])
      expect(fallback({ cast: casts[index]! }).pairs).toEqual([
        { label: "Item one", value: "0" },
        { label: "Item two", value: "0" },
      ]);
  });
});

describe("KeyValue field labels and metadata", () => {
  it("keeps each usable field paired with its own value and clips readable labels", () => {
    const field = "long_field_name_for_label";
    const seed = { id: "one", type: "record", sample: false };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["missing", "blank", field, "water-interval"] }],
      items: [{ ...seed, blank: "", [field]: "a".repeat(40), "water-interval": "  Every seven days  " }],
    };
    expect(fallback({ cast }).pairs).toEqual([
      { label: "Long field name for", value: "a".repeat(28) },
      { label: "Water interval", value: "Every seven days" },
    ]);
  });
  it("has the declared metadata and well-formed choose and write probes without actions", () => {
    expect(meta).toMatchObject({
      id: "KeyValue",
      group: "content",
      region: "body",
      weight: 2,
      tier: "phone",
      items: { key: "pairs", parts: ["root", "label", "value", "icon"] },
      states: ["filled", "empty", "loading"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(meta.pick).toContain("Stats");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "KeyValue")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "KeyValue" });
    expect(probes.some((probe) => (probe as { kind: string }).kind === "read")).toBe(false);
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("KeyValue");
    expect(registry.schema("KeyValue")).toBe(props);
    expect(registry.resolve("key-value")).toBe("KeyValue");
    expect(registry.resolve("ATTRIBUTES")).toBe("KeyValue");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

function renderPairs(style: "rows" | "grid", count: number, loading = false) {
  return renderInstance(
    "KeyValue",
    {
      style,
      pairs: Array.from({ length: count }, (_, index) => ({
        label: `Fact ${index}`,
        value: "a".repeat(28),
        ...(index % 2 ? {} : { icon: "leaf" }),
      })),
    },
    loading ? "loading" : "filled",
    { preset: "calm", mode: "light", accent: "moss" },
  );
}

describe("KeyValue rendering", () => {
  it.each(["rows", "grid"] as const)("draws each static pair once in %s at every allowed count", (style) => {
    for (let count = 1; count <= 6; count++) {
      const html = renderPairs(style, count);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).not.toContain('role="link"');
      expect(html).not.toContain('role="button"');
      for (let index = 1; index <= count; index++) {
        for (const part of ["root", "label", "value"])
          expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
        expect(html.includes(`data-testid="home/c1/r${index}/icon"`)).toBe(index % 2 === 1);
        if (style === "grid")
          expect(html).toMatch(
            new RegExp(`data-testid="home/c1/r${index}/value"[^>]*>[^<]*</span></div></div>`),
          );
      }
    }
  });
  it.each(["rows", "grid"] as const)("loads one placeholder per pair in %s at every count", (style) => {
    for (let count = 1; count <= 6; count++) {
      const html = renderPairs(style, count, true);
      expect(html.match(/aria-busy="true"/g)).toHaveLength(style === "grid" ? count : 1);
      expect(html).not.toContain('data-testid="home/c1/r1/label"');
    }
  });
});
