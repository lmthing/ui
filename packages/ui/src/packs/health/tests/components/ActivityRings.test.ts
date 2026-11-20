import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  readComponent,
  stampItemIds,
  type as typography,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance, styleAt } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.ActivityRings;
const ring = { label: "Move", value: 280, of: 400, unit: "kcal" };
const input = { rings: [ring, { label: "Exercise", value: 20, of: 30, unit: "min" }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("ActivityRings schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims labels and units without changing values", () => {
    const padded = { ...ring, label: "  Move  ", unit: "  kcal  " };
    expect(props.parse({ rings: [padded, padded] }).rings).toEqual([ring, ring]);
  });
  it.each([
    {},
    { rings: [] },
    { rings: [ring] },
    { rings: Array.from({ length: 4 }, () => ring) },
    ...[
      { label: "" },
      { label: " " },
      { label: "a".repeat(17) },
      { unit: "" },
      { unit: "a".repeat(9) },
      { value: -1 },
      { value: 1000001 },
      { value: Infinity },
      { value: NaN },
      { value: "280" },
      { of: 0 },
      { of: -1 },
      { of: 1000001 },
      { of: Infinity },
      { of: NaN },
      { id: "r1" },
      { color: "red" },
      { pixels: 4 },
    ].map((change) => ({ rings: [{ ...ring, ...change }, ring] })),
    { ...input, style: "bars" },
    { ...input, color: "#ffffff" },
    { ...input, unknown: true },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts exact text, count and numeric boundaries including over-goal values", () => {
    const max = { label: "a".repeat(16), unit: "u".repeat(8), value: 1000000, of: 1000000 };
    expect(props.safeParse({ rings: [max, max, max] }).success).toBe(true);
    expect(props.safeParse({ rings: [{ ...max, value: 0, of: 0.01 }, max] }).success).toBe(true);
    expect(props.safeParse({ rings: [{ ...max, of: 1 }, max] }).success).toBe(true);
  });
  it("adds item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["rings"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["rings"][number]["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("ActivityRings fallback and contract", () => {
  it("validates empty, useful, mixed, malformed and long casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["title"] }],
        items: [{ id: "one", type: "record", sample: true, title: "Morning" }],
      },
      {
        things: [],
        items: [
          { id: "one", type: "record", sample: true, title: "Morning" },
          { id: "two", type: "record", sample: true, title: "Evening" },
        ],
      },
      {
        things: [{ type: "record", fields: ["title"] }],
        items: [{ id: "one", type: "record", sample: true, title: 4 }],
      },
      {
        things: [{ type: "record", fields: ["title"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `record_${index}`,
          type: "record",
          sample: false,
          title: "a".repeat(80),
        })),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).rings).toEqual([
      { label: "Item one", value: 0, of: 1, unit: "0" },
      { label: "Item two", value: 0, of: 1, unit: "0" },
    ]);
    expect(fallback({ cast: casts[1]! }).rings.map((row) => row.label)).toEqual(["Morning", "Morning"]);
    expect(fallback({ cast: casts[2]! }).rings.map((row) => row.label)).toEqual(["Morning", "Evening"]);
  });
  it("preserves the core-first near miss and phone-only read contract", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.signature).toBe("ring_fill");
    expect(meta.realPath).toContain("read permission");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Ring");
    expect(meta.pick).toContain("Progress");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Ring")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "ActivityRings" });
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "a1")).toEqual([]);
  });
});

describe("ActivityRings states, parts and reading", () => {
  it.each([
    [2, 9999, "number"],
    [2, 10000, "body"],
    [3, 999, "number"],
    [3, 1000, "body"],
    [3, 1000000, "body"],
  ] as const)("fits %s goals at value %s using %s-sized numbers", (count, value, role) => {
    const max = { label: "a".repeat(16), value, of: 1000000, unit: "u".repeat(8) };
    const example = { rings: Array.from({ length: count }, () => max) };
    for (const state of meta.states) {
      const html = renderInstance("ActivityRings", example, state, theme);
      if (state === "filled")
        expect(styleAt(html, "home/c1/r1/value")).toContain(`font-size:${typography[role].size}px`);
      expect(meta.read(example, state)).toHaveLength(state === "filled" ? count : 0);
    }
  });
  it.each(examples)("renders every declared item part exactly once and reads all goals", (example) => {
    const html = renderInstance("ActivityRings", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html.match(/data-testid="home\/c1\/rings"/g)).toHaveLength(1);
    example.rings.forEach((row, index) => {
      for (const part of meta.items.parts)
        expect(html.match(new RegExp(`data-testid="home/c1/r${index + 1}/${part}"`, "g")) ?? []).toHaveLength(
          1,
        );
      expect(readComponent(components.ActivityRings, example, "a1").join("\n")).toContain(
        `${row.label}: ${row.value} of ${row.of} ${row.unit}`,
      );
    });
  });
  it("shows geometry-preserving loading without goal readings or item controls", () => {
    const html = renderInstance("ActivityRings", input, "loading", theme);
    expect(html).toContain("Loading");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("<svg");
    expect(html).not.toContain('data-testid="home/c1/r1/label"');
    expect(meta.read(input, "loading")).toEqual([]);
  });
  it.each([0, 200, 400, 800, 1000000])("keeps the actual value %s while clamping only the arc", (value) => {
    const example = { rings: [{ ...ring, value }, ring] };
    const html = renderInstance("ActivityRings", example, "filled", theme);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(meta.read(example, "filled")[0]).toBe(`Move: ${value} of 400 kcal`);
  });
});
