import { describe, expect, it } from "vitest";
import { expenseDisplay, expenseEditPath, expenseReceipt, expenseRows } from "../../copy";

const line = { title: "Supplies", net: 19.99, businessUse: 0.5, categoryRef: "costs", vatCode: "standard" };
const receipt = expenseReceipt.parse({
  expenseRef: "a",
  date: "2026-11-21",
  supplier: "Shop",
  lines: [line],
});
const data = {
  books_expense_rules: [
    { currency: "GBP", categories: { costs: 0.75 }, vatRates: { standard: { rate: 0.2, recovery: 0.5 } } },
  ],
  books_expense_choices: [
    { expenseRef: "a", title: "Supplies", categories: [{ value: "costs", label: "Costs" }], vatRates: [] },
  ],
};

describe("Expenses calculation and authorization", () => {
  it("rounds recoverable VAT and applies deductibility to business costs, not personal costs", () => {
    expect(expenseDisplay(receipt, [line], data, "en-GB")).toEqual({
      gross: "£23.99",
      cost: "£8.25",
      vat: "£1",
      voided: false,
    });
    expect(expenseDisplay(receipt, [{ ...line, vatCode: "unlisted" }], data)).toBeUndefined();
  });

  it("keeps voided figures for audit instead of replacing them with a different amount", () => {
    const first = expenseDisplay(receipt, receipt.lines, data);
    expect(expenseDisplay({ ...receipt, voided: true }, receipt.lines, data)).toEqual({
      ...first,
      voided: true,
    });
  });

  it("maps authored lines by receipt and title, and refuses duplicate or stale owners", () => {
    const inputs = { receipts: [receipt], style: "receipt" };
    const row = expenseRows(data, inputs)[1]!;
    expect(row).toMatchObject({ categories: [{ value: "costs", label: "Costs" }] });
    expect(
      expenseEditPath(row, { receipts: [{ ...receipt, lines: [{ ...line, title: "First" }, line] }] }),
    ).toEqual(["receipts", 0, "lines", 1]);
    expect(expenseEditPath(row, { receipts: [{ ...receipt, expenseRef: "other" }] })).toBeUndefined();
    expect(expenseEditPath(row, { receipts: [{ ...receipt, lines: [line, line] }] })).toBeUndefined();
  });
});
