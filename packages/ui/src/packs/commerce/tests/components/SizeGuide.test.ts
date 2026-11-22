import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.SizeGuide;
const { props, meta, examples, fallback, probes } = def;
const table = examples[0]!;
const fit = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/c1/${part}`;

describe("SizeGuide schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims headings and accepts the complete ten-by-six matrix", () => {
    const columns = ["  Width  ", ...Array(5).fill("a".repeat(12))];
    const rows = Array(10).fill({ size: "b".repeat(10), values: [0, 1, 2, 3, 4, 9999] });
    expect(props.parse({ columns, rows, at: 9, modelNote: "x".repeat(60) })).toMatchObject({
      columns: ["Width", ...columns.slice(1)],
      unit: "cm",
      style: "table",
      at: 9,
    });
    expectTypeOf<Props<typeof props, typeof meta>["rows"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    { columns: ["Rim"] },
    { columns: ["Rim", "abc".repeat(5)] },
    { columns: Array(7).fill("Rim") },
    { rows: [] },
    { rows: table.rows.slice(0, 1) },
    { rows: Array(11).fill(table.rows[0]) },
    { rows: [table.rows[0], { size: "Long", values: [1, 2, 3] }] },
    { rows: [table.rows[0], { size: "Long", values: [1, -2] }] },
    { rows: [table.rows[0], { size: "Long", values: [1, Infinity] }] },
    { rows: [table.rows[0], { size: "Long".repeat(3), values: [1, 2] }] },
    { at: 3 },
    { fitScore: 0 },
    { fitScore: 6 },
    { unit: "mm" },
    { style: "compact" },
    { detail: "tiny" },
    { modelNote: "x".repeat(61) },
    { color: "red" },
    { displayUnit: "in" },
  ])("rejects invalid input %j", (change) =>
    expect(props.safeParse({ ...table, ...change }).success).toBe(false),
  );
});

describe("SizeGuide fallback and metadata", () => {
  it("uses cast titles, padding unusable casts with shared neutral placeholders", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "sample", fields: ["name"] }],
        items: [{ id: "one", type: "sample", sample: true, name: "Regular" }],
      },
      { things: [], items: [{ id: "bad", type: "sample", sample: true, name: 1 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).rows.map(({ size }) => size)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: casts[1]! }).rows.map(({ size }) => size)).toEqual(["Regular", "Item two"]);
    expect(fallback({ cast: casts[2]! }).rows[0]?.size).toBe("Item one");
  });
  it("declares the dense phone contract, probe shapes and pack readiness gate", () => {
    expect(meta).toMatchObject({
      dense: true,
      weight: 3,
      tier: "phone",
      states: ["filled", "empty", "loading"],
    });
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "SizeGuide",
      "KeyValue",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["commerce"] }).ids.includes("SizeGuide")).toBe(packReady("commerce"));
  });
});

describe("SizeGuide states and parts", () => {
  it("shows one matrix, a radio group, and addressed reference sizes", () => {
    const html = renderInstance("SizeGuide", table, "filled", theme);
    const parts = addressedElements(html);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect([...parts.keys()].sort()).toEqual(
      [
        "root",
        "unit",
        "table",
        "r1/root",
        "r1/size",
        "r2/root",
        "r2/size",
        "r3/root",
        "r3/size",
        "fit",
        "model_note",
      ]
        .map(address)
        .sort(),
    );
    expect(parts.get(address("unit"))?.attributes).toContain('role="radiogroup"');
    expect(parts.get(address("r2/root"))?.attributes).toContain('aria-pressed="true"');
  });
  it("leads with fit in fit style and hides only the note in brief", () => {
    const full = renderInstance("SizeGuide", fit, "filled", theme);
    const brief = { ...fit, detail: "brief" } as const;
    expect(full.indexOf(address("fit"))).toBeLessThan(full.indexOf(address("table")));
    expect([...addressedElements(renderInstance("SizeGuide", brief, "filled", theme)).keys()]).toEqual(
      [...addressedElements(full).keys()].filter((part) => part !== address("model_note")),
    );
    expect(readComponent(def, brief, "s1").join("\n")).not.toContain(fit.modelNote!);
  });
  it.each(["empty", "loading"] as const)("exposes no actions when %s", (state) => {
    const html = renderInstance("SizeGuide", table, state, theme);
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(html).not.toContain('role="radio"');
    expect(parts.has(address("r1/root"))).toBe(false);
    expect(parts.has(address("table"))).toBe(state === "loading");
    expect(parts.has(address("empty"))).toBe(state === "empty");
    expect(readComponent(def, table, "s1", state).join("\n")).not.toContain("select");
  });
});

describe("SizeGuide read and act", () => {
  it("switches display units repeatedly without changing the original measurements or selected size", () => {
    const screen = { id: "home", components: [{ ...table, id: "s1", c: "SizeGuide" }] };
    const runtime = createScreenController({ screen, defs: components, requireMounted: false });
    const select = (value: string) => runtime.act({ address: "home/s1/unit", action: "select", value }).ok;
    const read = () => runtime.read();
    try {
      expect(read()).toContain("Measurement units · cm · Rim · Height");
      expect(read()).toContain("Reference size: Medium");
      expect(select("mm")).toBe(false);
      expect(select("in")).toBe(true);
      expect(read()).toContain("Small · 5 · 4.02");
      expect(read()).toContain("Reference size: Medium");
      expect(runtime.press("home/s1/r3/root").ok).toBe(true);
      expect(read()).toContain("Reference size: Large");
      expect(read()).toContain("Measurement units · in");
      expect(select("cm")).toBe(true);
      expect(read()).toContain("Small · 12.7 · 10.2");
      expect(read()).toContain("Reference size: Large");
      expect(runtime.press("home/s1/r2/size").ok).toBe(false);
    } finally {
      runtime.dispose();
    }
  });
});
