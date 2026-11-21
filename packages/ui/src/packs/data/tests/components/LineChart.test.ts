import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  stampItemIds,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.LineChart;
const { meta, props, examples, fallback, probes } = def;
const ledge = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = (input: object = ledge, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "LineChart", state }],
});
const defs = { LineChart: def };

describe("LineChart contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { title: " " },
    { title: "x".repeat(33) },
    { unit: "x".repeat(9) },
    { labels: [] },
    { labels: ["Mon", "Tue", "Wed"] },
    { labels: Array(32).fill("Date") },
    { labels: ["1", "2", "3", "x".repeat(7)] },
    { series: [] },
    { series: Array(4).fill(ledge.series[0]) },
    { series: [{ label: "x".repeat(17), values: [1, 2, 3, 4] }] },
    { series: [{ label: "A", values: [1, 2, 3, 4, 5] }] },
    { series: [{ label: "A", values: [1, 2, 3, "4"] }] },
    { series: [{ label: "A", values: [1, 2, 3, Infinity] }] },
    { series: [{ label: "A", values: [1, 2, 3, 4], id: "r1" }] },
    { density: "large" },
    { surface: "tinted" },
    { detail: "hidden" },
    { color: "red" },
    { point: 1 },
    { points: [] },
    { ticks: [1, 2, 3] },
  ])("rejects invalid input %j", (change) => {
    expect(props.safeParse({ ...ledge, ...change }).success).toBe(false);
  });

  it("keeps all 93 points addressable at the exact limits without writing derived fields", () => {
    const labels = Array.from({ length: 31 }, (_, index) => `Day ${index + 1}`);
    const series = Array.from({ length: 3 }, (_, index) => ({
      label: `Series ${index + 1}`,
      values: labels.map((_, index) => index - 1),
    }));
    const input = { title: "x".repeat(32), unit: "x".repeat(8), labels, series };
    const parsed = props.parse(input);
    expect(stampItemIds(meta, parsed)).toMatchObject({
      points: expect.arrayContaining([
        { id: "r93", line: 2, x: 30, series: "Series 3", label: "Day 31", value: 29 },
      ]),
    });
    const parts = addressedElements(renderInstance("LineChart", input, "filled", theme));
    expect(parts.get("home/c1/r93/root")?.attributes).toContain('role="radio"');
    expect(readScreen(screen(input), defs)).toContain("[s1/r93 select");
    expect(createRegistry({ packs: ["data"] }).ids.includes("LineChart")).toBe(packReady("data"));
  });
});

describe("LineChart fallback and probes", () => {
  it("uses cast labels or neutral placeholders, including for malformed cast items", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4 }] };
    for (const source of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({
      title: "Item one",
      labels: ["One", "Two", "Three", "Four"],
      series: [{ label: "Item two", values: [0, 0, 0, 0] }],
    });
    expect(fallback({ cast })).toMatchObject({ title: "Fern", labels: ["Fern", "Two", "Three", "Four"] });
    expect(fallback({ cast: malformed })).toEqual(fallback({ cast: empty }));
  });

  it("keeps the Sparkline near miss and choose, write, variant and read probes", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2, status: "ready" });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "LineChart" }),
        expect.objectContaining({ kind: "choose", expect: "Sparkline" }),
        expect.objectContaining({
          kind: "write",
          expect: "LineChart",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r2", action: "select" } }),
      ]),
    );
  });
});

describe("LineChart states and parts", () => {
  it("draws labelled axes, a latest summary, and separate same-date targets", () => {
    const html = renderInstance("LineChart", ledge, "filled", theme);
    const parts = addressedElements(html);
    for (const part of ["root", "title", "axes", "latest", "points", "series_1", "series_2"])
      expect(parts.has(`home/c1/${part}`)).toBe(true);
    for (const point of ["r2", "r6"])
      expect(parts.get(`home/c1/${point}/root`)?.attributes).toContain('aria-label="Nov 9"');
    expect(parts.get("home/c1/latest")?.text).toEqual(["Latest values"]);
    expect(parts.get("home/c1/unit")?.text).toEqual(["Unit: visits"]);
    for (const value of ["6", "1"]) expect(html).toContain(`>${value}<`);
    const brief = addressedElements(
      renderInstance("LineChart", { ...ledge, detail: "brief" }, "filled", theme),
    );
    expect([...brief.keys()]).toEqual([...parts.keys()].filter((address) => !address.endsWith("/latest")));
  });

  it.each(["empty", "loading"] as const)("omits point targets in the %s state", (state) => {
    const parts = addressedElements(renderInstance("LineChart", ledge, state, theme));
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has(state === "loading" ? "home/c1/axes" : "home/c1/title")).toBe(true);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(readScreen(screen(ledge, state), defs)).not.toContain(" select");
    expect(planAct(screen(ledge, state), defs, {}, [{ address: "s1/r1", action: "select" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("LineChart read and act", () => {
  it("handles taps through the mounted-part controller even in brief mode", () => {
    const chart = createScreenController({ screen: screen({ ...ledge, detail: "brief" }), defs });
    try {
      for (const point of ["r2", "r6"]) chart.registerPart(`home/s1/${point}/root`);
      expect(chart.press("home/s1/r2/root").ok).toBe(true);
      expect(chart.read()).toContain("[s1/r2 select = 1]");
      expect(chart.press("home/s1/r6/root").ok).toBe(true);
      expect(chart.read()).toContain("[s1/r6 select = 5]");
      expect(chart.read()).not.toContain("[s1/r2 select =");
    } finally {
      chart.dispose();
    }
  });

  it("selects and replaces one point, keeping the chart data and date addresses intact", () => {
    const chart = screen();
    expect(readScreen(chart, defs)).toContain("r2 Ferns · Nov 9 · 3 visits");
    expect(readScreen(chart, defs)).toContain("r6 Succulents · Nov 9 · 0 visits");
    const selected = planAct(chart, defs, {}, [{ address: "s1/r2", action: "select" }]);
    expect(selected).toMatchObject({ ok: true, values: { "home/s1/$point": 1 } });
    if (!selected.ok) return;
    const next = planAct(chart, defs, selected.values, [{ address: "s1/r6/root", action: "select" }]);
    expect(next).toMatchObject({
      ok: true,
      values: { "home/s1/$point": 5, "home/s1/r2": undefined, "home/s1/r6": 5 },
    });
    if (next.ok) expect(readScreen(chart, defs, next.values)).toContain("[s1/r6 select = 5]");
    expect(planAct(chart, defs, {}, [{ address: "s1/r2", action: "select", value: 5 }])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    expect(planAct(chart, defs, {}, [{ address: "s1/r9", action: "select" }]).ok).toBe(false);
  });
});
