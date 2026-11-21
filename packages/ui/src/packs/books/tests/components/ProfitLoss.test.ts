import * as c from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const def = c.components.ProfitLoss;
const { examples, fallback, props, probes, meta } = def;
const first = examples[0]!,
  compare = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("ProfitLoss contract", () => {
  it.each(examples)("accepts each worked example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { from: "2026-10-32" },
    { to: "2026-09-30" },
    { to: "2027-10-02" },
    { compareFrom: first.from },
    { compareFrom: first.to, compareTo: first.from },
    { compareFrom: first.from, compareTo: "2027-10-02" },
    { style: "summary" },
    { categories: [] },
    { costs: 99 },
    { color: "green" },
    { ledgerGoto: "bad link" },
  ])("rejects invalid or computed fields %o", (patch) => {
    expect(props.safeParse({ ...first, ...patch }).success).toBe(false);
  });
  it("uses an ordered neutral fallback and accepts the exact period limit", () => {
    for (const items of [
      [],
      [{ id: "one", type: "record", name: "Annual sales", sample: true }],
      [{ id: "broken", type: "record", name: 22, sample: false }],
    ]) {
      const item = fallback({ cast: { things: [], items } });
      expect(props.parse(item)).toMatchObject({ from: item.to, style: "statement" });
    }
    expect(props.safeParse({ ...first, to: "2027-10-01" }).success).toBe(true);
  });
  it("keeps the core near miss and a non-finish variant probe", () => {
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Stats" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(c.createRegistry({ packs: ["books"] }).ids.includes(meta.id)).toBe(c.packReady("books"));
  });
});

describe("ProfitLoss view and actions", () => {
  it("compares both periods and shows the taxable bridge, with stable briefs and addresses", () => {
    const { html, deviceData } = renderExample(meta.id, compare, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/profit")?.text).toContain("£2,605");
    expect(parts.get("home/c1/taxable_profit")?.text).toContain("£2,710");
    expect(parts.get("home/c1/r4/root")?.attributes).toContain('role="link"');
    const input = { ...compare, detail: "brief" as const };
    const brief = addressedElements(renderInstance(meta.id, input, "filled", theme, { deviceData }));
    expect(brief.get("home/c1/r4/subtotal")).toEqual(parts.get("home/c1/r4/subtotal"));
    expect(brief.has("home/c1/r4/change")).toBe(false);
    expect(brief.has("home/c1/profit_change")).toBe(true);
    expect(c.readComponent(def, input, "c1", "filled", {}, undefined, deviceData).join(" ")).toContain(
      "[c1/r4 press→walk_ledger]",
    );
  });

  it("does not shift addresses after a category is removed by a host refresh", () => {
    const { deviceData } = renderExample(meta.id, first, "filled", theme);
    const data = { ...deviceData, books_ledger_entries: deviceData?.books_ledger_entries?.slice(1) };
    const html = renderInstance(meta.id, first, "filled", theme, { deviceData: data });
    const parts = addressedElements(html);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(parts.get("home/c1/r2/label")?.text).toContain("Repotting");
    const screen = { id: "home", components: [{ ...first, id: "c1", c: meta.id }] };
    const plan = (address: string) =>
      c.planAct(screen, { ProfitLoss: def }, {}, [{ address, action: "press" }], null, "planner", data);
    expect(plan("c1/r1").ok).toBe(false);
    expect(plan("c1/r2")).toMatchObject({ ok: true, links: [{ goto: "care_ledger" }] });
  });

  it.each(["loading", "empty", "error"] as const)("shows no drill-down or totals in %s", (state) => {
    const { html, deviceData } = renderExample(meta.id, first, state, theme);
    expect(addressedElements(html).has("home/c1/profit")).toBe(false);
    expect(c.readComponent(def, first, "c1", state, {}, undefined, deviceData).join("\n")).not.toContain(
      "press",
    );
  });

  it("shows no navigation without a link or valid records", () => {
    const { html } = renderExample(meta.id, { ...first, ledgerGoto: undefined }, "filled", theme);
    expect(addressedElements(html).get("home/c1/r1/root")?.attributes).not.toContain('role="link"');
    expect(renderInstance(meta.id, first, "filled", theme)).toContain("Statement unavailable");
  });
});
