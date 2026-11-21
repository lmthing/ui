import { describe, expect, it } from "vitest";
import { profitDisplay, profitRows } from "../../copy";

const period = { from: "2026-03-01", to: "2026-03-31", ledgerGoto: "ledger" };
const prior = { compareFrom: "2026-02-01", compareTo: "2026-02-28" };
const sale = { entryRef: "sale", categoryRef: "fees", date: period.from, direction: "in", net: 40 };
const cost = {
  entryRef: "cost",
  categoryRef: "materials",
  date: period.to,
  direction: "out",
  net: 80,
  vatCode: "standard",
  businessUse: 0.5,
  recovery: 0.5,
};
const rules = {
  basis: "cash",
  version: "cash_v1",
  currency: "GBP",
  vatRates: { standard: 0.2 },
  categories: [
    { slot: 6, ref: "materials", label: "Materials", kind: "expense", allowable: 0.75 },
    { slot: 2, ref: "fees", label: "Fees", kind: "income" },
    { slot: 4, ref: "capital", label: "Capital", kind: "capital" },
  ],
};
const data = (cash: readonly unknown[], patch = {}) => ({
  books_profit_rules: [{ ...rules, ...patch }],
  books_ledger_entries: cash,
});

describe("ProfitLoss accounting", () => {
  it("reconciles cash and taxable loss using recovery, business use and disallowed costs", () => {
    const ledger = data([
      sale,
      cost,
      { ...sale, categoryRef: "capital", entryRef: "capital", net: 1000 },
      { ...sale, entryRef: "transfer", categoryRef: "reserve", transferRef: "tax_move", net: 1000 },
    ]);
    expect(profitDisplay(period, ledger, "en-GB")).toMatchObject({
      profitLabel: "Net loss",
      amounts: { income: "£40", costs: "£44", profit: "-£4", disallowed_costs: "£11", taxable_profit: "£7" },
    });
  });

  it("subtracts income and expense refunds and aggregates the comparison separately", () => {
    const ledger = data([
      sale,
      cost,
      { ...sale, entryRef: "refund", net: 10, direction: "out" },
      { ...cost, entryRef: "credit", net: 40, direction: "in" },
      { ...sale, entryRef: "prior_sale", date: prior.compareFrom, net: 15 },
    ]);
    const input = { ...period, ...prior };
    const result = profitDisplay(input, ledger, "en-GB");
    expect(result?.amounts).toMatchObject({ income: "£30", costs: "£22", profit: "£8" });
    const rows = profitRows(ledger, input);
    expect(result?.row(rows[1]!)).toEqual({ subtotal: "£30", change: "+£15 vs prior period" });
    expect(rows).toHaveLength(12);
    expect(rows.map((item, i) => (item.active ? i + 1 : null)).filter(Boolean)).toEqual([2, 6]);
  });

  it.each([
    data([sale, sale]),
    data([sale], { basis: "accrual" }),
    data([sale], { categories: [] }),
    data([sale, cost], { vatRates: {} }),
    data([sale], { categories: [rules.categories[0], { ...rules.categories[1], slot: 6 }] }),
  ])("does not draw misleading totals for unreconciled records", (ledger) => {
    expect(profitDisplay(period, ledger)).toBeUndefined();
    expect(profitRows(ledger, period)).toEqual([]);
  });

  it("distinguishes an empty ledger from an unavailable ledger", () => {
    expect(profitDisplay(period, data([]))?.empty).toBe(true);
    expect(profitDisplay(period, {})).toBeUndefined();
  });
});
