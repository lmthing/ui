import type { DeviceData } from "@lmthing/ui/catalog";
import { read, type Source } from "./worked-source";

export function books(source: Source): DeviceData {
  const { defs } = source;
  const trot = read(source, defs.Ledger, "l1");
  const cafe = read(source, defs.Ledger, "l2");
  const { from, to, schemeRef } = read(source, defs.VatReturn);
  const { runRef, from: payFrom, to: payTo, payDate, payees } = read(source, defs.Payroll);
  const currency = "GBP";
  const vatRates = { standard: 0.2 };
  return {
    books_ledger_rules: [{ currency, vatRates, openingMinor: { cash: 0, reserve: 0 } }],
    books_profit_rules: [
      {
        basis: "cash",
        version: "cash_v1",
        currency,
        vatRates,
        categories: [
          { slot: 1, ref: "walks", label: "Dog walks", kind: "income" },
          { slot: 2, ref: "travel", label: "Travel", kind: "expense" },
          { slot: 3, ref: "equipment", label: "Equipment", kind: "expense" },
        ],
      },
    ],
    // This is the Trot report's dated cash feed, not account movements for both demos.
    // The Ledger views retain their own account-level rows; the café feeds its VAT snapshot separately.
    books_ledger_entries: trot.entries.map(
      ({ entryRef, date, direction, categoryRef, net, transferRef }) => ({
        entryRef,
        date,
        direction,
        categoryRef,
        net,
        transferRef,
      }),
    ),
    books_expense_rules: [
      { currency, categories: { travel: 1, equipment: 1 }, vatRates: { none: { rate: 0, recovery: 0 } } },
    ],
    books_vat_snapshots: [
      {
        from,
        to,
        schemeRef,
        scheme: "domestic_cash",
        version: "cash_v1",
        currency,
        rates: vatRates,
        reconciled: true,
        entries: cafe.entries.map(({ sourceRef, date, direction, payee, net, vatCode }) => ({
          sourceRef,
          date,
          kind: direction === "in" ? "sale" : "purchase",
          category: payee,
          netMinor: Math.round(net * 100),
          vatCode,
        })),
      },
    ],
    books_payroll_rules: [{ currency, rates: { sample_pay: { deductionRate: 0.1, employerRate: 0.05 } } }],
    books_payroll_runs: [{ runRef, from: payFrom, to: payTo, payDate, payees }],
  };
}
