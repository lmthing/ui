import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Counter;

describe("Counter schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ label: "  Water  " })).toEqual({ label: "Water", value: 0, step: 1 });
    expect(props.parse({ label: "Walks", unit: " dogs ", value: 3, step: 2 })).toEqual({
      label: "Walks",
      unit: "dogs",
      value: 3,
      step: 2,
    });
  });
  it.each([
    {},
    { label: "" },
    { label: "   " },
    { label: "a".repeat(25) },
    { label: "Water", unit: "" },
    { label: "Water", unit: "   " },
    { label: "Water", unit: "a".repeat(9) },
    { label: "Water", value: -1 },
    { label: "Water", value: 0.5 },
    { label: "Water", value: "2" },
    { label: "Water", value: NaN },
    { label: "Water", value: Infinity },
    { label: "Water", value: Number.MAX_SAFE_INTEGER + 1 },
    { label: "Water", step: 0 },
    { label: "Water", step: -1 },
    { label: "Water", step: 101 },
    { label: "Water", step: 1.5 },
    { label: "Water", step: "1" },
    { label: "Water", step: Infinity },
    { label: "Water", style: "tiles" },
    { label: "Water", color: "red" },
    { label: "Water", pixels: 4 },
    { label: "Water", id: "c1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact text limits and integer boundaries", () => {
    for (const value of [0, Number.MAX_SAFE_INTEGER]) {
      for (const step of [1, 100]) {
        expect(props.safeParse({ label: "a".repeat(24), unit: "a".repeat(8), value, step }).success).toBe(
          true,
        );
      }
    }
  });
  it("infers only schema fields for the view", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["step"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["unit"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Counter fallback and metadata", () => {
  it("validates with empty, matching, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [
          { type: "walk", fields: ["title"] },
          { type: "plant", fields: ["name"] },
        ],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      { things: [{ type: "  ", fields: [] }], items: [] },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ label: "Item one", value: 0 });
    expect(fallback({ cast: casts[1]! })).toEqual({ label: "plant", value: 0 });
    expect(fallback({ cast: casts[2]! })).toEqual({ label: "walk", value: 0 });
    expect(fallback({ cast: casts[3]! })).toEqual({ label: "Item one", value: 0 });
    expect(fallback({ cast: casts[4]! }).label).toHaveLength(24);
    expect(fallback({ cast: casts[5]! })).toEqual({ label: "Item one", value: 0 });
  });
  it("offers exactly the two drawn button actions even at zero", () => {
    for (const value of [0, 3]) {
      expect(affordancesOf(meta, props.parse({ label: "Walks", value }), "c1")).toEqual([
        { address: "c1/minus", part: "minus", action: "decrement", detail: "" },
        { address: "c1/plus", part: "plus", action: "increment", detail: "" },
      ]);
    }
    expect(meta.parts).toEqual(["root", "value", "label", "minus", "plus"]);
    expect(meta.states).toEqual(["filled"]);
  });
  it("reads the value, optional unit and drawn button labels with their step actions", () => {
    const buttons = ['"One less" (decrement)', '"One more" (increment)'];
    expect(meta.read({ label: "Water" }, "filled")).toEqual(["0", ...buttons]);
    expect(meta.read(examples[0], "filled")).toEqual(["2", ...buttons]);
    expect(meta.read(examples[1], "filled")).toEqual(["3 dogs", ...buttons]);
    expect(meta.read(examples[1], "empty")).toEqual([]);
    expect(meta.read(examples[1], "loading")).toEqual([]);
    expect(readComponent(components.Counter, examples[1], "c1").join("\n")).toContain("3 dogs");
    expect(readComponent(components.Counter, examples[0], "c1")).toEqual([
      'c1 Counter 2 — "One less" (decrement) — "One more" (increment) — "Water glasses for fern" [c1/minus decrement] [c1/plus increment]',
    ]);
  });
  it("has the required metadata and choose, write and read probe blocks", () => {
    expect(meta).toMatchObject({ tier: "phone", group: "data", region: "body", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Stats");
    expect(meta.pick).toContain("Field");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Counter" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Add one more",
      expect: { address: "c1/plus", action: "increment" },
    });
  });
  it("registers its schema and case-tolerant aliases automatically", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Counter");
    expect(registry.schema("Counter")).toBe(props);
    expect(registry.resolve("TALLY")).toBe("Counter");
    expect(registry.resolve("quantity")).toBe("Counter");
  });
});

describe("Counter rendering", () => {
  it.each(examples)("draws one root, the value and both named button actions", (example) => {
    const html = renderInstance("Counter", example, "filled", {
      preset: "calm",
      accent: "moss",
      mode: "light",
    });
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="home/c1/label"');
    expect(html).toContain('data-testid="home/c1/value"');
    expect(html).toContain("tabular-nums");
    for (const [part, name] of [
      ["minus", "One less"],
      ["plus", "One more"],
    ]) {
      const tag = html.match(new RegExp(`<[^>]*data-testid="home/c1/${part}"[^>]*>`))?.[0];
      expect(tag).toContain('role="button"');
      expect(tag).toContain(`aria-label="${name}"`);
    }
    if ("unit" in example) expect(html).toContain(example.unit);
  });
});
