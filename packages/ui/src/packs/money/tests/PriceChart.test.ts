import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  readScreen,
  type CastLike,
  type Props,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const def = components.PriceChart;
const { props, meta, examples, fallback, probes } = def;
const example = examples[0]!;
const ranges = ["day", "week", "month", "year", "all"] as const;
const theme: ThemeChoice = { preset: "calm", mode: "light", accent: "moss" };
const screen: ScreenLike = { id: "home", components: [{ id: "p1", c: "PriceChart", ...example }] };
const defs = { PriceChart: def };

describe("PriceChart schema", () => {
  it.each(examples)("accepts a domain example", (value) => expect(props.safeParse(value).success).toBe(true));

  it.each(ranges)("accepts %s with the exact maximum name and sample count", (range) => {
    expect(props.parse({ name: ` ${"a".repeat(24)} `, points: Array(60).fill(0), range })).toEqual({
      name: "a".repeat(24),
      points: Array(60).fill(0),
      range,
      detail: "full",
      emphasis: "normal",
      surface: "card",
    });
  });

  it.each([
    {},
    { ...example, name: " " },
    { ...example, name: "a".repeat(25) },
    { ...example, points: Array(7).fill(0) },
    { ...example, points: Array(61).fill(0) },
    ...[-1, Infinity, NaN, "1", null].map((value) => ({ ...example, points: Array(8).fill(value) })),
    { ...example, range: "quarter" },
    { ...example, range: undefined },
    ...Object.entries({ current: 103, change: 5, currency: "USD", color: "red", pixels: 4 }).map(
      ([key, value]) => ({ ...example, [key]: value }),
    ),
  ])("rejects invalid or derived fields", (input) => expect(props.safeParse(input).success).toBe(false));

  it("exposes only the typed wire props to the view", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["range"]>().toEqualTypeOf<(typeof ranges)[number]>();
    expectTypeOf<View["points"]>().toEqualTypeOf<number[]>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("currency");
  });
});

describe("PriceChart fallback and metadata", () => {
  it("uses bounded cast titles or shared neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const matching: CastLike = {
      things: [{ type: "holding", fields: ["name"] }],
      items: [{ id: "reserve", type: "holding", sample: true, name: "Reserve fund" }],
    };
    const long: CastLike = { ...matching, items: [{ ...matching.items[0]!, name: "x".repeat(80) }] };
    const malformed: CastLike = { ...matching, items: [{ ...matching.items[0]!, name: 4 }] };
    for (const cast of [empty, matching, long, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({ name: "Item one", points: Array(8).fill(0), range: "month" });
    expect(fallback({ cast: matching }).name).toBe("Reserve fund");
    expect(fallback({ cast: malformed }).name).toBe("Item one");
  });

  it("declares the service tier, the built states and the pack readiness boundary", () => {
    expect(meta.tier).toBe("service");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(createRegistry({ packs: ["money"] }).ids.includes("PriceChart")).toBe(packReady("money"));
  });

  it("keeps the core-first near miss and choose, write and read probes", () => {
    expect(meta.pick).toContain("Sparkline");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "PriceChart",
      "Sparkline",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "PriceChart" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "p1/range", action: "select" },
    });
  });
});

describe("PriceChart parts and states", () => {
  it("draws each filled part exactly once and offers one group of five options", () => {
    const html = renderInstance("PriceChart", example, "filled", theme);
    expect(meta.parts).toEqual(["root", "name", "price", "change", "line", "range"]);
    for (const part of meta.parts) expect(html.split(`data-testid="home/c1/${part}"`)).toHaveLength(2);
    const range = elementAt(html, "home/c1/range");
    expect(range.attributes).toContain('role="radiogroup"');
    expect(range.children).toHaveLength(5);
    expect(range.children[2]!.attributes).toContain('aria-checked="true"');
    expect(
      range.children.filter(({ attributes }) => attributes.includes('aria-checked="true"')),
    ).toHaveLength(1);
  });

  it("draws a loading shell without live readings or actionable ranges", () => {
    const html = renderInstance("PriceChart", example, "loading", theme);
    expect(html).toContain('data-testid="home/c1/root"');
    expect(html).toContain('aria-busy="true"');
    for (const part of ["name", "price", "change"])
      expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(false);
    expect(/<path[^>]* d="M/.test(html)).toBe(false);
    expect(html.includes('role="radio"')).toBe(false);
    const range = elementAt(html, "home/c1/range");
    expect(range.children).toHaveLength(5);
    expect(range.children.every(({ attributes }) => attributes.includes('aria-hidden="true"'))).toBe(true);
    expect(readComponent(def, example, "p1", "loading")).toEqual(["p1 PriceChart (loading)"]);
  });
});

describe("PriceChart read and act", () => {
  it("reads the drawn chart and offers no destructive or per-point actions", () => {
    const reading = readComponent(def, example, "p1").join("\n");
    for (const text of [
      example.name,
      "$103",
      "+$5 this period",
      "Start",
      "Latest",
      "1D",
      "1W",
      "1M",
      "1Y",
      "All",
    ])
      expect(reading).toContain(text);
    expect(reading).toContain("[p1/range select !needs-service]");
    expect(affordancesOf(meta, props.parse(example), "p1")).toEqual([
      { address: "p1/range", part: "range", action: "select", detail: "" },
    ]);
  });

  it("selects every range at the same address without mutating the supplied history", () => {
    const controller = createScreenController({ screen, defs });
    try {
      for (const range of ranges) {
        expect(controller.act({ address: "p1/range", action: "select", value: range })).toMatchObject({
          ok: true,
        });
        expect(controller.store.get("home/p1/range")).toBe(range);
        expect(readScreen(screen, defs, controller.store.snapshot("home"))).toContain(`select = "${range}"`);
      }
      expect(screen.components[0]).toMatchObject(example);
    } finally {
      controller.dispose();
    }
  });

  it("rejects missing or malformed select values and actions on non-controls", () => {
    for (const value of [undefined, "", false, NaN])
      expect(planAct(screen, defs, {}, [{ address: "p1/range", action: "select", value }])).toMatchObject({
        ok: false,
        code: "invalid_value",
      });
    for (const [address, action] of [
      ["p1/line", "select"],
      ["p1/range", "press"],
    ] as const)
      expect(planAct(screen, defs, {}, [{ address, action, value: "week" }])).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
  });
});

describe("PriceChart loading actions", () => {
  it("does not dispatch range selections while loading", () => {
    const loading: ScreenLike = {
      ...screen,
      components: [{ ...screen.components[0]!, state: "loading" }],
    };
    const controller = createScreenController({ screen: loading, defs });
    try {
      expect(controller.act({ address: "p1/range", action: "select", value: "week" })).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
    } finally {
      controller.dispose();
    }
  });
});
