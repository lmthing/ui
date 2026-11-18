import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Sparkline;
const input = { label: "Measurement", value: "18%", points: [42, 28, 18] };

describe("Sparkline schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text without changing the written value", () => {
    expect(props.parse({ ...input, label: " Measurement ", value: " €180 " })).toEqual({
      ...input,
      value: "€180",
      tone: "neutral",
    });
  });
  it.each([
    {},
    { ...input, label: "" },
    { ...input, label: " " },
    { ...input, label: "a".repeat(25) },
    { ...input, value: "" },
    { ...input, value: " " },
    { ...input, value: "a".repeat(11) },
    { ...input, value: 18 },
    { ...input, points: [] },
    { ...input, points: [1, 2] },
    { ...input, points: Array.from({ length: 13 }, () => 1) },
    { ...input, points: [1, "2", 3] },
    { ...input, points: [1, Number.NaN, 3] },
    { ...input, points: [1, Infinity, 3] },
    { ...input, points: [1, -Infinity, 3] },
    { ...input, tone: "accent" },
    { ...input, color: "red" },
    { ...input, pixels: 44 },
    { ...input, id: "s1" },
    { ...input, goto: "details" },
  ])("rejects invalid input", (invalid) => expect(props.safeParse(invalid).success).toBe(false));
  it("accepts exact text limits, every count and all tones", () => {
    for (const tone of ["neutral", "good", "warn", "bad"])
      for (let count = 3; count <= 12; count++) {
        expect(
          props.safeParse({
            label: "a".repeat(24),
            value: "1".repeat(10),
            points: Array.from({ length: count }, (_, index) => index - 6.5),
            tone,
          }).success,
        ).toBe(true);
      }
  });
  it("infers typed view props without item ids or presentation props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["points"]>().toEqualTypeOf<number[]>();
    expectTypeOf<ViewProps["value"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["tone"]>().toEqualTypeOf<"neutral" | "good" | "warn" | "bad">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
  });
});

function renderSparkline(state: "filled" | "loading") {
  return renderInstance("Sparkline", input, state, { preset: "calm", mode: "light", accent: "moss" });
}

describe("Sparkline rendering", () => {
  it.each(["filled", "loading"] as const)("renders the %s state without duplicate parts", (state) => {
    const html = renderSparkline(state);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).not.toMatch(/role="(?:link|button)"/);
    if (state === "loading") {
      expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
      expect(html).toContain('aria-label="Loading"');
      expect(html).not.toContain(input.label);
    }
    for (const part of ["label", "value", "line"])
      expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(state === "filled");
  });
});

describe("Sparkline fallback and metadata", () => {
  it("validates with empty, matching, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [
          { type: "record", fields: [] },
          { type: "other", fields: [] },
        ],
        items: [{ id: "other", type: "other", sample: true, value: 99 }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      {
        things: [{ type: " ", fields: [] }],
        items: [{ id: "first", type: "record", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      label: "Item one",
      value: "0",
      points: [0, 0, 0],
    });
    expect(fallback({ cast: casts[1]! }).label).toBe("plant");
    expect(fallback({ cast: casts[2]! }).label).toBe("record");
    expect(fallback({ cast: casts[3]! }).label).toBe("x".repeat(24));
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
  });
  it("declares its drawn parts, states and no actions", () => {
    expect(meta).toMatchObject({
      id: "Sparkline",
      group: "data",
      region: "body",
      weight: 1,
      tier: "phone",
      parts: ["root", "label", "value", "line"],
      states: ["filled", "loading"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    for (const example of examples) expect(affordancesOf(meta, props.parse(example), "s1")).toEqual([]);
  });
  it.each([
    { points: [1, 2, 3], direction: "rising" },
    { points: [3, 2, 1], direction: "falling" },
    { points: [3, 9, 3], direction: "steady" },
    { points: [-3, -8, -1], direction: "rising" },
    { points: [0, 0, 0], direction: "steady" },
  ])("reads $direction from the first and last point", ({ points, direction }) => {
    const parsed = props.parse({ ...input, points });
    expect(meta.read(parsed, "filled")).toEqual([direction]);
    expect(meta.read(parsed, "loading")).toEqual([]);
    const read = readComponent(components.Sparkline, parsed, "s1").join("\n");
    expect(read).toContain(direction);
    expect(read).toContain('"Measurement"');
    expect(read).toContain('"18%"');
  });
  it("has a real path and well-formed choose and write probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Bars");
    expect(meta.pick).toContain("Stats");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Sparkline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Bars")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Sparkline" });
    expect(probes.some((probe) => (probe as { kind: string }).kind === "read")).toBe(false);
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Sparkline");
    expect(registry.schema("Sparkline")).toBe(props);
    expect(registry.resolve("TREND")).toBe("Sparkline");
    expect(registry.resolve("line-chart")).toBe("Sparkline");
  });
});
