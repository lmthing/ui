import type { PackMeta } from "../../catalog";

export const pack = {
  id: "books",
  example: "Trot classifies walk income and expense receipts, closes the period and tracks its tax reserve.",
  probes: [
    {
      kind: "pack",
      idea: "My small business needs its own cash-basis books: record receipts and expenses, reconcile accounts and calculate period profit. No invoicing or selling.",
      expect: ["books"],
    },
    {
      kind: "pack",
      idea: "Close my café's books: work out taxable profit and set aside tax based on its recorded business income and costs. Nothing for customers or staff.",
      expect: ["books"],
    },
    {
      kind: "pack",
      idea: "Track our household's personal bank balances, shared groceries, monthly budgets and bills. This is not for a business.",
      expect: ["money"],
    },
    {
      kind: "choose",
      need: "Show one big money figure labelled Tax reserve: 60 dollars. No breakdown, target, rows or tax calculations.",
      expect: "Amount",
    },
  ],
} as const satisfies PackMeta;
