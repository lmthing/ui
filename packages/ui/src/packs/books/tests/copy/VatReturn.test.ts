import { describe, expect, it } from "vitest";
import { validVatSnapshot, vatDisplay, vatRows } from "../../copy";

const period = { from: "2026-01-01", to: "2026-03-31", schemeRef: "domestic_cash" };
const sale = {
  sourceRef: "sale",
  category: "Service",
  date: period.from,
  kind: "sale",
  netMinor: 1005,
  vatCode: "standard",
};
const purchase = {
  ...sale,
  sourceRef: "purchase",
  category: "Equipment",
  kind: "purchase",
  netMinor: 5005,
  businessUse: 0.5,
  recovery: 0.8,
};
const drawing = { ...sale, sourceRef: "drawing", category: "Drawings", kind: "excluded" };
const base = {
  ...period,
  scheme: "domestic_cash",
  currency: "GBP",
  version: "cash_v1",
  reconciled: true,
  rates: { standard: 0.2 },
  entries: [sale, purchase, drawing],
};
const data = (patch = {}) => ({ books_vat_snapshots: [{ ...base, ...patch }] });

describe("VAT reconciliation", () => {
  it("computes the nine boxes after rounding recoverable tax, excluding drawings", () => {
    const rows = vatRows(data(), { ...period, ledgerGoto: "ledger" });
    expect(rows.map(({ minor }) => minor)).toEqual([201, 0, 201, 400, -199, 1005, 2503, 0, 0]);
    expect(rows.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(rows[4]).toMatchObject({
      sources: ["Service", "Equipment"],
      exclusions: ["Equipment", "Drawings"],
      goto: "ledger",
    });
    expect(rows[1]?.linked).toBe(false);
    const display = vatDisplay({ ...period, style: "reconcile" }, data(), "en-GB");
    expect(display).toMatchObject({ totalLabel: "VAT refundable", total: "£1.99" });
    expect(display?.box(rows[4]!).value).toBe("£1.99");
  });

  it("nets signed refunds instead of counting them as new sales or purchases", () => {
    const entries = [
      sale,
      purchase,
      { ...sale, sourceRef: "credit", netMinor: -505 },
      { ...purchase, sourceRef: "purchase_credit", netMinor: -1005 },
    ];
    expect(vatRows(data({ entries }), period).map(({ minor }) => minor)).toEqual([
      100, 0, 100, 320, -220, 500, 2000, 0, 0,
    ]);
  });

  it.each([
    { scheme: "flat_rate" },
    { schemeRef: "other" },
    { reconciled: false },
    { version: "" },
    { rates: {} },
    { entries: [sale, sale] },
    { entries: [{ ...sale, date: "2025-01-01" }] },
  ])("rejects invalid or mismatched evidence %o", (patch) => {
    expect(vatRows(data(patch), period)).toEqual([]);
    expect(validVatSnapshot(data(patch), period)).toBe(false);
  });

  it("rejects ambiguous snapshots and allows saved snapshots to be read without saving again", () => {
    expect(validVatSnapshot({ books_vat_snapshots: [base, base] }, period)).toBe(false);
    expect(validVatSnapshot(data({ saved: true }), period)).toBe(false);
    expect(vatDisplay(period, data({ saved: true }))?.saved).toBe(true);
  });
});
