import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Scale;

describe("Scale schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ label: "  How did it go?  " })).toEqual({
      style: "dots",
      label: "How did it go?",
      value: 0,
      readonly: false,
      detail: "full",
      emphasis: "normal",
    });
  });
  it.each([
    {},
    { label: "" },
    { label: " ".repeat(4) },
    { label: "a".repeat(33) },
    { label: 4 },
    { label: "Rating", value: -1 },
    { label: "Rating", value: 6 },
    { label: "Rating", value: 1.5 },
    { label: "Rating", value: "3" },
    { label: "Rating", value: NaN },
    { label: "Rating", value: Infinity },
    { label: "Rating", value: null },
    { label: "Rating", style: "slider" },
    { label: "Rating", density: "airy" },
    { label: "Rating", detail: "hidden" },
    { label: "Rating", emphasis: "bold" },
    { label: "Rating", color: "red" },
    { label: "Rating", pixels: 44 },
    { label: "Rating", levels: [] },
    { label: "Rating", levels: [1, 2, 3, 4, 5] },
    { label: "Rating", l1: "Low" },
    { label: "Rating", id: "s1" },
    { label: "Rating", value: 4.5 },
    { label: "Rating", value: 4.25, readonly: true, style: "stars" },
    { label: "Rating", readonly: true, style: "dots", value: 3 },
    { label: "Rating", readonly: true, style: "mood", value: 3 },
    { label: "Rating", meta: "212 reviews" },
    { label: "Rating", readonly: true, style: "stars", meta: "a".repeat(25) },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([0, 1, 2, 3, 4, 5])("accepts every level including unset and both bounds: %s", (value) => {
    for (const style of ["mood", "stars", "dots"])
      expect(props.safeParse({ label: "a".repeat(32), style, value }).success).toBe(true);
  });
  it("keeps generated levels and presentation details out of view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"mood" | "stars" | "dots">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("levels");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Scale fallback and metadata", () => {
  it("validates empty, matching, mixed and malformed casts using shared neutral copy", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
      },
      {
        things: [{ type: "dog", fields: ["name"] }],
        items: [{ id: "clover", type: "dog", sample: true, name: "Clover" }],
      },
      {
        things: [{ type: "entry", fields: ["title"] }],
        items: [
          { id: "other", type: "other", sample: true, title: "Ignored" },
          { id: "entry", type: "entry", sample: true, title: "x".repeat(80) },
        ],
      },
      {
        things: [{ type: "entry", fields: ["title"] }],
        items: [{ id: "entry", type: "entry", sample: true, title: 4 }],
      },
      { things: [], items: [{ id: "entry", type: "entry", sample: true, title: "Entry" }] },
      { things: [{ type: "", fields: [] }], items: [] },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast }).value).toBe(0);
    }
    expect(fallback({ cast: casts[0]! })).toEqual({
      label: placeholderDetail,
      style: "dots",
      value: 0,
    });
    expect(fallback({ cast: casts[1]! })).toEqual({ label: "Fern", style: "mood", value: 0 });
    expect(fallback({ cast: casts[2]! })).toEqual({ label: "Clover", style: "stars", value: 0 });
    expect(fallback({ cast: casts[3]! }).label).toBe("x".repeat(32));
    expect(fallback({ cast: casts[4]! }).label).toBe(placeholderDetail);
    expect(fallback({ cast: casts[5]! }).label).toBe("Entry");
  });
});

describe("Scale fallback and metadata", () => {
  it.each(["mood", "stars", "dots"] as const)("offers exactly five select targets for %s", (style) => {
    for (const value of [0, 1, 2, 3, 4, 5]) {
      const input = props.parse({ label: "Rating", style, value });
      expect(affordancesOf(meta, input, "s1")).toEqual(
        [1, 2, 3, 4, 5].map((level) => ({
          address: `s1/l${level}`,
          part: `l${level}`,
          action: "select",
          detail: "",
        })),
      );
      expect(readComponent(components.Scale, input, "s1")[0]).toContain(`${value} of 5`);
    }
    expect(meta.parts).toEqual(["root", "label", "meta", "l1", "l2", "l3", "l4", "l5"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta).not.toHaveProperty("items");
  });
  it("shows a readonly rating with halves, a note and nothing to act on", () => {
    const input = props.parse({
      label: "Rated",
      style: "stars",
      value: 4.5,
      readonly: true,
      meta: "212 reviews",
    });
    expect(affordancesOf(meta, input, "s1")).toEqual([]);
    const line = readComponent(components.Scale, input, "s1")[0];
    expect(line).toContain("4.5 of 5");
    expect(line).toContain('"212 reviews"');
    const html = renderInstance("Scale", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).not.toContain('role="radio"');
    expect(html).not.toMatch(/data-testid="home\/c1\/l[1-5]"/);
    expect(html).toContain('data-testid="home/c1/meta"');
    expect(html).toContain('aria-label="4.5 of 5"');
  });
});

describe("Scale fallback and metadata", () => {
  it("has a tier, real path and well-formed choose, write and read probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.region).toBe("body");
    expect(meta.group).toBe("input");
    expect(meta.weight).toBe(2);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Segmented");
    expect(meta.pick).toContain("Field");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Scale")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Segmented")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(3);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Scale" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Rate it 5",
      expect: { address: "s1/l5", action: "select" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Scale");
    expect(registry.schema("Scale")).toBe(props);
    expect(registry.resolve("s-c-a-l-e")).toBe("Scale");
    expect(registry.resolve("s-c-a-l-e")).toBe("Scale");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

it("keeps a brief readonly rating but hides its note from the drawing and the reader", () => {
  const rating = { label: "Park rating", style: "stars", value: 4.5, readonly: true, meta: "212 walkers" };
  const brief = { ...rating, detail: "brief" };
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const html = renderInstance("Scale", brief, "filled", theme);
  expect(meta.variantParts["detail.brief"].hides).toEqual(["meta"]);
  expect(props.parse(rating).density).toBeUndefined();
  expect(html).not.toContain('data-testid="home/c1/meta"');
  expect(html).toContain('aria-label="4.5 of 5"');
  expect(readComponent(components.Scale, brief, "s1")[0]).not.toContain("212 walkers");
  expect(affordancesOf(meta, props.parse(brief), "s1")).toEqual([]);
});
