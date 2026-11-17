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
    { label: "Rating", color: "red" },
    { label: "Rating", pixels: 44 },
    { label: "Rating", levels: [] },
    { label: "Rating", levels: [1, 2, 3, 4, 5] },
    { label: "Rating", l1: "Low" },
    { label: "Rating", id: "s1" },
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

describe("Scale rendering", () => {
  it.each(["mood", "stars", "dots"] as const)(
    "draws every %s value with exactly one address and the right radio state per level",
    (style) => {
      for (const value of [0, 1, 2, 3, 4, 5]) {
        const html = renderInstance("Scale", { label: "a".repeat(32), style, value }, "filled", {
          preset: "calm",
          mode: "light",
          accent: "moss",
        });
        expect(html.match(/data-testid=/g)).toHaveLength(7);
        expect(html.match(/role="radiogroup"/g)).toHaveLength(1);
        for (const part of ["root", "label"])
          expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
        for (const level of [1, 2, 3, 4, 5]) {
          const target = html.match(new RegExp(`<[^>]*data-testid="home/c1/l${level}"[^>]*>`))?.[0];
          expect(target).toContain('role="radio"');
          expect(target).toContain(`aria-checked="${level === value}"`);
          expect(target).toContain(`aria-label="${level} of 5"`);
        }
        if (style === "stars") expect(html.match(/fill="currentColor"/g) ?? []).toHaveLength(value);
      }
    },
  );
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
    expect(meta.parts).toEqual(["root", "label", "l1", "l2", "l3", "l4", "l5"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta).not.toHaveProperty("items");
  });
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
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Scale" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Rate it 5",
      expect: { address: "s1/l5", action: "select" },
    });
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Scale");
    expect(registry.schema("Scale")).toBe(props);
    expect(registry.resolve("RATING")).toBe("Scale");
    expect(registry.resolve("s-t-a-r-s")).toBe("Scale");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
