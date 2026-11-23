import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  stampItemIds,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { describe, expect, expectTypeOf, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Table;
const { meta, props, examples, fallback, probes } = def;
const ledge = {
  ...examples[0]!,
  columns: [
    { label: "Plant", kind: "text" },
    { label: "Watered", kind: "date" },
    { label: "Health", kind: "status" },
  ],
  rows: [
    { cells: ["Boston fern", "2026-11-20", "Thriving"], goto: "fern" },
    { cells: ["Rubber plant", "2026-11-18", "Review"], goto: "rubber" },
  ],
};
const trot = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = (input: object = ledge, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "t1", c: "Table", state }],
});
const defs = { Table: def };

describe("Table contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { columns: [] },
    { columns: ledge.columns.slice(0, 1) },
    { columns: Array.from({ length: 7 }, () => ({ label: "Name", kind: "text" })) },
    { columns: [{ label: "x".repeat(15), kind: "text" }, ...ledge.columns.slice(1)] },
    { columns: [{ label: "Plant", kind: "unknown" }, ...ledge.columns.slice(1)] },
    { rows: [] },
    { rows: Array.from({ length: 21 }, () => ledge.rows[0]) },
    { rows: [{ cells: ["Fern", "2026-11-20"] }] },
    { rows: [{ cells: ["Fern", "2026-02-30", "Ready"] }] },
    { rows: [{ cells: ["Fern", "2026-11-20", "x".repeat(25)] }] },
    { rows: [{ cells: ["Fern", "2026-11-20", 1] }] },
    { rows: [{ cells: ["Fern", "2026-11-20", "Ready"], goto: "Bad ID" }] },
    { rows: [{ cells: ["Fern", "2026-11-20", "Ready"], id: "r1" }] },
    { rows: [{ cells: ["Fern", "2026-11-20", "Ready"], checked: true }] },
    { sort: 3 },
    { sort: -1 },
    { sort: 1.5 },
    { selectable: "true" },
    { density: "large" },
    { color: "red" },
  ])("rejects invalid Table fields: %j", (change) => {
    expect(props.safeParse({ ...ledge, ...change }).success).toBe(false);
  });

  it("keeps the full dense limits and stamps ids only after parsing", () => {
    const columns = Array.from({ length: 6 }, () => ({ label: "x".repeat(14), kind: "text" }));
    const rows = Array.from({ length: 20 }, () => ({ cells: columns.map(() => "x".repeat(24)) }));
    const parsed = props.parse({ columns, rows, sort: 5, selectable: false });
    expectTypeOf<Props<typeof props, typeof meta>["rows"][number]["id"]>().toEqualTypeOf<string>();
    expect(parsed.rows[0]).not.toHaveProperty("id");
    expect(stampItemIds(meta, parsed).rows[19]).toMatchObject({ id: "r20" });
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3 });
    expect(createRegistry({ packs: ["data"] }).ids.includes("Table")).toBe(packReady("data"));
  });

  it("requires numbers in both numeric column kinds", () => {
    for (const cells of [
      ["Route", "8", 96],
      ["Route", 8, "96"],
      ["Route", 8, Infinity],
    ]) {
      expect(props.safeParse({ ...trot, rows: [{ cells }] }).success).toBe(false);
    }
  });
});

describe("Table fallback and probes", () => {
  it("uses cast values and neutral placeholders; malformed values still parse", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4, room: null }] };
    for (const source of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({
      rows: [{ cells: ["Item one", "Details"] }],
      selectable: false,
    });
    expect(fallback({ cast }).rows[0]?.cells).toEqual(["Fern", "Bathroom"]);
    expect(fallback({ cast: malformed }).rows[0]?.cells).toEqual(["Item one", "Details"]);
  });

  it("keeps the core near miss and the choose, write, variant and read probes", () => {
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Table" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({
          kind: "write",
          expect: "Table",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r1/pick", action: "check" } }),
      ]),
    );
  });
});

describe("Table states and parts", () => {
  it("keeps sortable header, count, linked and static rows, and conditional checkbox parts", () => {
    const filled = addressedElements(renderInstance("Table", ledge, "filled", theme));
    expect(filled.get("home/c1/header")?.attributes).toContain('role="radiogroup"');
    expect(filled.get("home/c1/r1/root")?.attributes).toContain('role="link"');
    expect(filled.get("home/c1/r1/pick")?.attributes).toContain('role="checkbox"');
    expect(filled.has("home/c1/r2/status_3")).toBe(true);
    expect(filled.get("home/c1/count")?.text).toContain("2 rows");
    const brief = addressedElements(renderInstance("Table", { ...trot, detail: "brief" }, "filled", theme));
    expect(brief.has("home/c1/header")).toBe(true);
    expect(brief.has("home/c1/count")).toBe(false);
    expect(brief.get("home/c1/r1/root")?.attributes).not.toContain('role="link"');
    expect(brief.has("home/c1/r1/pick")).toBe(false);
  });

  it.each(["empty", "loading"] as const)("draws the %s state with no action targets", (state) => {
    const html = renderInstance("Table", ledge, state, theme);
    const parts = addressedElements(html);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has(state === "empty" ? "home/c1/empty" : "home/c1/matrix")).toBe(true);
    expect(parts.has("home/c1/header")).toBe(false);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(parts.has("home/c1/r1/pick")).toBe(false);
    expect(html).not.toContain('role="radio"');
    expect(readScreen(screen(ledge, state), defs)).not.toMatch(/\[(?:t1\/header|t1\/r1)/);
  });
});

describe("Table read and act", () => {
  it("sorts by a named or indexed column without changing which row a pick or press addresses", () => {
    const table = screen();
    const before = readScreen(table, defs);
    expect(before).toContain("r2: Rubber plant · 18 Nov 2026 · Review");
    expect(before.indexOf("r2: Rubber plant")).toBeLessThan(before.indexOf("r1: Boston fern"));
    const selected = planAct(table, defs, {}, [
      { address: "t1/r1/pick", action: "check", value: true },
      { address: "t1/header", action: "select", value: "Plant" },
      { address: "t1/r1", action: "press" },
    ]);
    expect(selected).toMatchObject({
      ok: true,
      values: { "home/t1/$sort": 0, "home/t1/r1/pick": true },
      links: [{ goto: "fern", address: "home/t1/r1" }],
    });
    if (!selected.ok) return;
    const after = readScreen(table, defs, selected.values);
    expect(after.indexOf("r1: Boston fern")).toBeLessThan(after.indexOf("r2: Rubber plant"));
    expect(after).toContain("[t1/r1/pick check:done]");
    expect(
      planAct(table, defs, selected.values, [
        { address: "t1/header", action: "select", value: 1 },
        { address: "t1/r1/pick", action: "check", value: false },
      ]),
    ).toMatchObject({ ok: true, values: { "home/t1/$sort": 1, "home/t1/r1/pick": false } });
  });

  it("rejects unavailable and invalid actions with no destructive action to confirm", () => {
    expect(planAct(screen(trot), defs, {}, [{ address: "t1/r1/pick", action: "check" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(planAct(screen(trot), defs, {}, [{ address: "t1/r1", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    for (const value of [3, "Unknown"]) {
      expect(planAct(screen(), defs, {}, [{ address: "t1/header", action: "select", value }])).toMatchObject({
        ok: false,
        code: "invalid_value",
      });
    }
    expect(meta).not.toHaveProperty("confirmParts");
  });
});
