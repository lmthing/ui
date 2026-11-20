import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import {
  affordancesOf,
  component,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Ring;
const input = { value: 3, of: 5, label: "Completed" };

describe("Ring schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ ...input, label: " Completed ", sub: " Two to go " })).toEqual({
      emphasis: "normal",
      detail: "full",
      value: 3,
      of: 5,
      label: "Completed",
      sub: "Two to go",
    });
  });
  it.each([
    {},
    { of: 5, label: "Completed" },
    { value: 3, label: "Completed" },
    { value: 3, of: 5 },
    { ...input, value: -1 },
    { ...input, value: "3" },
    { ...input, value: Number.NaN },
    { ...input, value: Infinity },
    { ...input, of: 0 },
    { ...input, of: -1 },
    { ...input, of: "5" },
    { ...input, of: Number.NaN },
    { ...input, of: Infinity },
    { ...input, label: "" },
    { ...input, label: " ".repeat(4) },
    { ...input, label: "a".repeat(25) },
    { ...input, sub: "" },
    { ...input, sub: " ".repeat(4) },
    { ...input, sub: "a".repeat(49) },
    { ...input, style: "md" },
    { ...input, emphasis: "quiet" },
    { ...input, detail: "minimal" },
    { ...input, color: "red" },
    { ...input, pixels: 4 },
    { ...input, goto: "details" },
    { ...input, id: "r1" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts exact text limits, fractions, zero and amounts above the target", () => {
    for (const emphasis of meta.variants.emphasis)
      for (const value of [0, 0.5, 5, 8]) {
        expect(
          props.safeParse({ emphasis, value, of: 5, label: "a".repeat(24), sub: "a".repeat(48) }).success,
        ).toBe(true);
      }
    expect(props.safeParse({ ...input, value: 0.25, of: 0.5 }).success).toBe(true);
  });
  it("types view props without items or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["emphasis"]>().toEqualTypeOf<"normal" | "hero">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("rows");
  });
});

describe("Ring fallback", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [
          { type: "walk", fields: [] },
          { type: "plant", fields: [] },
        ],
        items: [{ id: "fern", type: "plant", sample: false, name: "Fern" }],
      },
      {
        things: [{ type: "x".repeat(80), fields: [] }],
        items: [{ id: "first", type: "other", sample: true, name: 4 }],
      },
      { things: [{ type: " ", fields: [] }], items: [] },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      value: 0,
      of: 1,
      label: "Item one",
    });
    expect(fallback({ cast: casts[1]! }).label).toBe("plant");
    expect(fallback({ cast: casts[2]! }).label).toBe("walk");
    expect(fallback({ cast: casts[3]! }).label).toBe("x".repeat(24));
    expect(fallback({ cast: casts[4]! }).label).toBe("Item one");
    expect(fallback({ cast: casts[5]! }).label).toBe("Item one");
  });
});

describe("Ring metadata and probes", () => {
  it("declares only drawn parts, supported states and no actions", () => {
    expect(meta).toMatchObject({
      id: "Ring",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "ring", "value", "label", "sub"],
      states: ["filled", "loading"],
    });
    for (const example of examples) expect(affordancesOf(meta, props.parse(example), "c1")).toEqual([]);
  });
  it("has a real path and well-formed choose and write probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Stats");
    expect(meta.pick).toContain("Steps");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Ring")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Ring" });
  });
  it("builds a data-only registry with separator-tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Ring");
    expect(registry.schema("Ring")).toBe(props);
    expect(registry.resolve("r-i-n-g")).toBe("Ring");
    expect(registry.resolve("r-i-n-g")).toBe("Ring");
  });
  it("reads the actual value and goal without clamping or leaking loading values", () => {
    expect(readComponent(components.Ring, examples[0], "c1")).toEqual(['c1 Ring 3 of 5 — "Watered today"']);
    expect(readComponent(components.Ring, { ...input, value: 8 }, "c1")[0]).toContain("8 of 5");
    expect(readComponent(components.Ring, examples[1], "c1")[0]).toContain(
      '9 of 12 — "Walks this week" — "3 to go"',
    );
    expect(readComponent(components.Ring, input, "c1", "loading")).toEqual(["c1 Ring (loading)"]);
    expect(meta.read(input, "loading")).toEqual([]);
  });
});

it("keeps the goal accessible when a secondary caption is hidden", () => {
  const brief = { ...input, detail: "brief", sub: "Two to go" };
  const html = renderInstance("Ring", brief, "filled", { preset: "calm", mode: "light", accent: "moss" });
  expect(meta.variantParts["detail.brief"].hides).toEqual(["sub"]);
  expect(html).not.toContain('data-testid="home/c1/sub"');
  expect(html).toContain('data-testid="home/c1/ring"');
  expect(readComponent(components.Ring, brief, "r1")).toEqual(['r1 Ring 3 of 5 — "Completed"']);
});

function renderRing(emphasis: "normal" | "hero", value: number, state: "filled" | "loading", sub?: string) {
  return renderInstance("Ring", { ...input, emphasis, value, sub }, state, {
    preset: "calm",
    mode: "light",
    accent: "moss",
  });
}

describe.each(meta.variants.emphasis)("Ring rendering in %s", (emphasis) => {
  it.each([0, 0.5, 5, 8])("renders %s against the goal in each state", (value) => {
    for (const state of ["filled", "loading"] as const)
      for (const sub of [undefined, "Two to go"]) {
        const html = renderRing(emphasis, value, state, sub);
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        expect(html).not.toMatch(/role="(?:link|button)"/);
        if (state === "loading") {
          expect(html).toContain('aria-busy="true"');
          const box = component.base[emphasis === "hero" ? "ringLg" : "ringMd"];
          expect(html.split('aria-busy="true"')[1]).toContain(String(box));
          expect(html).not.toContain('data-testid="home/c1/ring"');
          continue;
        }
        for (const part of ["ring", "value", "label"])
          expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
        expect(html.includes('data-testid="home/c1/sub"')).toBe(Boolean(sub));
        expect(html).toContain("of 5");
        const arcs = [...html.matchAll(/stroke-dasharray="([^"]+)"/g)];
        expect(arcs).toHaveLength(1);
        const [filled, full] = arcs[0]![1]!.split(" ").map(Number);
        expect(filled! / full!).toBeCloseTo(Math.min(1, value / 5));
      }
  });
});
