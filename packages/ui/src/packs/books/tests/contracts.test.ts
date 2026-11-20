import { describe, expect, it } from "vitest";
import * as c from "@lmthing/ui/catalog";

const { Ledger, Expenses, ProfitLoss, VatReturn, Payroll } = c.components;
const neutral: c.CastLike = { things: [], items: [] };
const sample: c.CastLike = {
  things: [{ type: "worker", fields: ["name"] }],
  items: [{ id: "one", type: "worker", sample: true, name: "Robin" }],
};
const malformed: c.CastLike = {
  ...sample,
  items: [{ ...sample.items[0]!, name: 42 }],
};
const defs: readonly c.Definition[] = [Ledger, Expenses, ProfitLoss, VatReturn, Payroll];
const nearMisses = ["Timeline", "Field", "Stats", "KeyValue", "People"];

describe("books contract coverage", () => {
  it.each(defs)("validates examples, fallbacks, tiers and probe coverage for $meta.id", (def) => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of [neutral, sample, malformed])
      expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    expect(def.meta).toMatchObject({ tier: "phone", weight: 3, dense: true });
    const miss = nearMisses[defs.indexOf(def)]!;
    expect(def.meta.pick).toContain(miss);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: miss }));
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: def.meta.id }));
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: def.meta.id }));
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "read" }));
    if (def.meta.status === "draft") expect(c.packReady("books")).toBe(false);
  });

  it("takes authored labels from the cast, and neutral labels otherwise", () => {
    for (const [cast, expected] of [
      [sample, "Robin"],
      [neutral, c.placeholderTitle(0)],
    ] as const) {
      expect(Ledger.fallback({ cast }).entries[0]?.payee).toBe(expected);
      expect(Expenses.fallback({ cast }).receipts[0]?.supplier).toBe(expected);
      expect(Payroll.fallback({ cast }).payees[0]?.name).toBe(expected);
    }
  });
});

describe("books register contracts", () => {
  it("rejects invalid ledger entries and transfer pairs without accepting computed amounts", () => {
    const one = Ledger.examples[0]!;
    const pair = Ledger.examples[1]!;
    const entry = one.entries[0]!;
    for (const input of [
      { ...one, entries: [] },
      { ...one, entries: [entry, entry] },
      { ...one, entries: [{ ...entry, net: 0 }] },
      { ...one, entries: [{ ...entry, sourceRef: "Bad Ref" }] },
      { ...one, entries: [{ ...entry, date: "2026-12-01" }] },
      { ...one, entries: [{ ...entry, gross: 165 }] },
      { ...one, entries: [{ ...entry, payee: "a".repeat(33) }] },
      { ...pair, entries: [pair.entries[0], { ...pair.entries[1], net: 41 }] },
      { ...pair, entries: [pair.entries[0], { ...pair.entries[1], vatCode: "standard" }] },
    ])
      expect(Ledger.props.safeParse(input).success).toBe(false);
    expect(c.readComponent(Ledger, one, "l1").join("\n")).toContain("[l1/r1 press→visit_receipt]");
    expect(c.readComponent(Ledger, pair, "l1").join("\n")).not.toContain("[l1/r1 press");
    expect(Ledger.meta.partTiers).toEqual({ export: "service" });
  });

  it("limits receipt seeds and shows only actions for the current receipt state", () => {
    const draft = Expenses.examples[0]!;
    const posted = Expenses.examples[1]!;
    const receipt = draft.receipts[0]!;
    const split = receipt.lines[0]!;
    for (const input of [
      { ...draft, receipts: [] },
      { ...draft, receipts: [receipt, { ...receipt, expenseRef: "other" }] },
      { ...draft, receipts: [{ ...receipt, receipt: "https://example.com/receipt" }] },
      { ...draft, receipts: [{ ...receipt, lines: Array.from({ length: 9 }, () => split) }] },
      { ...draft, receipts: [{ ...receipt, lines: [{ ...split, businessUse: 1.1 }] }] },
      { ...draft, receipts: [{ ...receipt, voided: true }] },
    ])
      expect(Expenses.props.safeParse(input).success).toBe(false);
    const edit = c.readComponent(Expenses, draft, "e1").join("\n");
    expect(edit).toContain("[e1/post press]");
    expect(edit).toContain("[e1/r2/net set");
    expect(edit).toContain("[e1/r2/business_use set");
    expect(edit).toContain("r3: Delivery · 7 · business_use=0.5");
    expect(edit).not.toContain("[e1/r2/category select]");
    expect(edit).not.toContain("[e1/r2/vat select]");
    expect(edit).not.toContain("/void press");
    const register = c.readComponent(Expenses, posted, "e1").join("\n");
    expect(register).toContain("[e1/r1/void press]");
    expect(register).not.toContain("/post press");
    const success = c.readComponent(Expenses, posted, "e1", "success").join("\n");
    expect(success).toContain("[e1/r1/void press]");
    const voided = { ...posted, receipts: [{ ...posted.receipts[0]!, voided: true }] };
    const voidedRead = c.readComponent(Expenses, voided, "e1", "success").join("\n");
    expect(voidedRead).not.toContain("/void press");
    expect(Expenses.meta.partTiers).toEqual({ capture: "ok" });
    expect(Expenses.meta.confirmParts).toContain("void");
  });
});

describe("books report contracts", () => {
  it("rejects backwards or overlong periods, half a comparison and model-written figures", () => {
    const from = "2026-01-01";
    const to = "2027-01-01";
    const input = { from, to };
    expect(ProfitLoss.props.safeParse(input).success).toBe(true);
    expect(ProfitLoss.props.safeParse({ ...input, to: "2027-01-02" }).success).toBe(false);
    expect(ProfitLoss.props.safeParse({ from: to, to: from }).success).toBe(false);
    expect(ProfitLoss.props.safeParse({ ...input, compareFrom: from }).success).toBe(false);
    expect(ProfitLoss.props.safeParse({ ...input, profit: 450 }).success).toBe(false);
    expect(VatReturn.props.safeParse({ ...input, schemeRef: "domestic_cash", boxes: [30] }).success).toBe(
      false,
    );
    expect(VatReturn.props.safeParse({ ...input, schemeRef: "Domestic Cash" }).success).toBe(false);
  });

  it("validates payroll basis, finalisation and payment against the correct actions", () => {
    const draft = Payroll.examples[0]!;
    const paid = Payroll.examples[1]!;
    const row = draft.payees[0]!;
    for (const input of [
      { ...draft, payees: [{ ...row, hours: undefined }] },
      { ...draft, payees: [{ ...row, basis: "salary" }] },
      { ...draft, payees: [{ ...row, hours: 745 }] },
      { ...draft, payees: [{ ...row, paidAt: "2026-12-01T12:00:00Z" }] },
      { ...paid, voided: true },
      { ...paid, finalizedAt: "2026-12-01T09:00:00" },
    ])
      expect(Payroll.props.safeParse(input).success).toBe(false);
    const zeroGross = { ...row, rate: 0.3, hours: 3, adjustments: [{ label: "Correction", amount: -0.9 }] };
    expect(Payroll.props.safeParse({ ...draft, payees: [zeroGross] }).success).toBe(true);
    const before = c.readComponent(Payroll, draft, "p1").join("\n");
    expect(before).toContain("[p1/finalize press]");
    expect(before).toContain("[p1/void press]");
    expect(before).not.toContain("/record press");
    const after = c.readComponent(Payroll, paid, "p1").join("\n");
    expect(after).toContain("[p1/r1/send press !needs-service]");
    expect(after).not.toContain("/record press");
    expect(after).not.toContain("/void press");
    expect(Payroll.meta.confirmParts).toEqual(["finalize", "void"]);
    expect(Payroll.meta.partTiers).toEqual({ send: "service" });
  });
});
