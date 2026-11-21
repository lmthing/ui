import * as c from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it, vi } from "vitest";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const def = c.components.Expenses;
const { props, meta, fallback, probes, examples } = def;
const draft = examples[0]!,
  posted = examples[1]!,
  receipt = draft.receipts[0]!,
  line = receipt.lines[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Expenses wire contract", () => {
  it.each(examples)("accepts a worked example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { receipts: [] },
    { receipts: [receipt, receipt] },
    { gross: 42 },
    { color: "red" },
    { receipts: [{ ...receipt, supplier: "a".repeat(33) }] },
    { receipts: [{ ...receipt, lines: [{ ...line, net: 0 }] }] },
    { receipts: [{ ...receipt, lines: [{ ...line, businessUse: 1.1 }] }] },
    { receipts: [{ ...receipt, lines: [{ ...line, vatRates: [] }] }] },
    { receipts: [{ ...receipt, lines: Array.from({ length: 9 }, () => line) }] },
  ])("rejects invalid or computed fields %o", (patch) => {
    expect(props.safeParse({ ...draft, ...patch }).success).toBe(false);
  });
  it("supports eight splits and six receipt summaries", () => {
    expect(
      props.safeParse({ ...draft, receipts: [{ ...receipt, lines: Array.from({ length: 8 }, () => line) }] })
        .success,
    ).toBe(true);
    const receipts = Array.from({ length: 7 }, (_, i) => ({ ...receipt, expenseRef: `exp_${i}` }));
    expect(props.safeParse({ receipts: receipts.slice(1) }).success).toBe(true);
    expect(props.safeParse({ receipts }).success).toBe(false);
  });
  it.each(["Fern", 42, undefined])("uses cast labels or neutral fallback for %o", (name) => {
    const cast = {
      things: [],
      items: name === undefined ? [] : [{ id: "fern", type: "plant", sample: true, name }],
    };
    expect(props.parse(fallback({ cast })).receipts[0]?.supplier).toBe(name === "Fern" ? name : "Item one");
  });
  it("keeps the Field near miss and shared brief probe", () => {
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(c.createRegistry({ packs: ["books"] }).ids.includes(meta.id)).toBe(c.packReady("books"));
  });
});

describe("Expenses parts and actions", () => {
  it("uses projected amounts and shows split choices only with host authorization", () => {
    const { html, deviceData } = renderExample(meta.id, draft, "filled", theme);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/gross")?.text).toContain("£33.60");
    expect(parts.get("home/c1/r2/category")?.attributes).toContain('role="radiogroup"');
    expect(parts.get("home/c1/r2/net")?.attributes).toContain('role="spinbutton"');
    expect(c.readComponent(def, draft, "c1", "filled", {}, undefined, deviceData).join(" ")).toContain(
      '[c1/r2/category select = "Supplies"; choices ["Supplies","Travel"]]',
    );
    const without = renderInstance(meta.id, draft, "filled", theme);
    expect(addressedElements(without).get("home/c1/r2/category")?.attributes).not.toContain(
      'role="radiogroup"',
    );
  });

  it("accepts only that split's choices and writes them into the canonical receipt", () => {
    const { deviceData } = renderExample(meta.id, draft, "filled", theme);
    const permissions = deviceData?.books_expense_choices ?? [];
    const data = { ...deviceData, books_expense_choices: permissions.slice(0, 1) };
    const screen = { id: "home", components: [{ ...draft, id: "c1", c: meta.id }] };
    const control = createScreenController({ screen, defs: { Expenses: def }, deviceData: data });
    try {
      expect(control.act({ address: "c1/r3/category", action: "select", value: "Supplies" }).ok).toBe(false);
      expect(control.act({ address: "c1/r2/category", action: "select", value: "Unknown" }).ok).toBe(false);
      expect(control.act({ address: "c1/r2/category", action: "select", value: "Travel" }).ok).toBe(true);
      expect(
        props.parse(
          control.snapshotScreen().components.map(({ id: _id, c: _c, ...component }) => component)[0],
        ).receipts[0]?.lines[0]?.categoryRef,
      ).toBe("travel");
      expect(control.act({ address: "c1/r2/net", action: "set", value: -1 }).ok).toBe(false);
      expect(control.act({ address: "c1/r2/business_use", action: "set", value: 101 }).ok).toBe(false);
      expect(control.act({ address: "c1/r2/business_use", action: "set", value: 25 }).ok).toBe(true);
      expect(control.read()).toContain("business_use=0.25");
    } finally {
      control.dispose();
    }
  });
});

describe("Expenses lifecycle", () => {
  it("requires confirmation before notifying the host to void a receipt", () => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...posted, id: "c1", c: meta.id }] };
    const control = createScreenController({ screen, defs: { Expenses: def }, onAction });
    try {
      expect(control.press("c1/r1/void").ok).toBe(true);
      expect(control.confirmation).toMatchObject({ source: "home/c1/r1/void" });
      expect(onAction).not.toHaveBeenCalled();
      expect(control.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/c1/r1/void", action: "press" });
      expect(control.press("confirm/confirm").ok).toBe(false);
    } finally {
      control.dispose();
    }
  });

  it("offers void only for a posted active receipt and keeps it confirmable", () => {
    const { html, deviceData } = renderExample(meta.id, posted, "success", theme);
    expect(addressedElements(html).get("home/c1/r1/void")?.attributes).toContain('role="button"');
    expect(c.readComponent(def, posted, "c1", "success", {}, undefined, deviceData).join(" ")).toContain(
      "[c1/r1/void press]",
    );
    expect(meta.confirmParts).toContain("void");
    const voided = { ...posted, receipts: [{ ...posted.receipts[0]!, voided: true }] };
    expect(
      addressedElements(renderInstance(meta.id, voided, "success", theme, { deviceData })).has(
        "home/c1/r1/void",
      ),
    ).toBe(false);
    expect(c.readComponent(def, voided, "c1", "success", {}, undefined, deviceData).join(" ")).not.toContain(
      "/void press",
    );
  });

  it.each(["empty", "loading", "error"] as const)("does not show receipt controls in %s", (state) => {
    const { html } = renderExample(meta.id, draft, state, theme);
    const parts = addressedElements(html);
    expect(parts.has("home/c1/post")).toBe(false);
    expect(parts.has("home/c1/capture")).toBe(state === "empty");
    expect(parts.has("home/c1/r2/net")).toBe(false);
  });
});
