import { z } from "zod";
import * as c from "../../../catalog";
import { periodFields, seedPeriod, validPeriod } from "../seeds";

// Core first: Stats/default shows independent figures, not a reconciled statement and taxable-profit bridge.
export const meta = {
  id: "ProfitLoss",
  status: "draft",
  group: "data",
  purpose: "Reconcile business income, costs and taxable profit for a period.",
  pick: "A business accounting statement of income and costs by category for a period, optionally reconciling bookkeeping profit to taxable profit. Not independent headlines (Stats), one number (Amount), a chart (LineChart), or VAT boxes (VatReturn).",
  writeHints: [
    "Write dates and an optional ledger destination, never figures or categories. The host computes all amounts and reads the full ledger.",
    'Use both comparison dates or neither. Each period is ordered and at most 366 days inclusive. Use style "tax_bridge" for disallowed costs and taxable profit; otherwise use "statement".',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The host aggregates the full local ledger under the brief's accounting and deductibility rules.",
  variants: { density: ["comfortable", "compact"] },
  parts: [
    "root",
    "from",
    "to",
    "comparison",
    "income",
    "costs",
    "profit",
    "disallowed_costs",
    "taxable_profit",
  ],
  items: { key: "categories", parts: ["root", "label", "subtotal", "change"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    ...periodFields,
    compareFrom: c.isoDate.optional(),
    compareTo: c.isoDate.optional(),
    ledgerGoto: c.screenId.optional(),
    style: z.enum(["statement", "tax_bridge"]).default("statement"),
  })
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(
    ({ compareFrom, compareTo }) =>
      (compareFrom === undefined && compareTo === undefined) ||
      (compareFrom !== undefined &&
        compareTo !== undefined &&
        validPeriod({ from: compareFrom, to: compareTo })),
    { path: ["compareTo"], message: "Use both comparison dates in an ordered period of at most 366 days" },
  );

export function fallback(): z.input<typeof props> {
  return { ...seedPeriod };
}

export const examples = [
  { from: "2026-10-01", to: "2026-10-31", ledgerGoto: "care_ledger" },
  {
    from: "2026-11-01",
    to: "2026-11-30",
    compareFrom: "2026-10-01",
    compareTo: "2026-10-31",
    ledgerGoto: "walk_ledger",
    style: "tax_bridge",
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProfitLoss");
export const probes = [
  choose(
    "Close my business's month: group income and expenses by category, reconcile to accounting profit, then add back disallowed costs to get taxable profit.",
  ),
  choose(
    "Show exactly three independent headline numbers side by side: total walks, active clients and new enquiries.",
    "Stats",
  ),
  write(
    "Reconcile October 2026 income, costs and profit from my plant-care business, with category drill-down to care_ledger. Don't compare another period.",
  ),
  read("Open the source lines for the first income category.", { address: "p1/r1", action: "press" }),
] satisfies c.Probe[];
