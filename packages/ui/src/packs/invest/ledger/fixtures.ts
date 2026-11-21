import type { LedgerOperation, Portfolio } from "./records";

export const date = (day: number) => `2026-01-${String(day).padStart(2, "0")}T00:00:00Z`;
export const now = Date.parse(date(20));
export const statement: Portfolio = {
  portfolioId: "education",
  since: date(1),
  openingCash: 0,
  openingContributed: 0,
  positions: [
    { assetId: "fund", name: "Global Equity Fund", symbol: "GEF", class: "fund", units: 0, unitCost: 0 },
  ],
  entries: [
    { id: "seed_cash", at: date(2), kind: "deposit", amount: 1000 },
    { id: "first_buy", at: date(2), kind: "buy", assetId: "fund", units: 10, unitPrice: 80 },
  ],
  quotes: [{ assetId: "fund", price: 90, quotedAt: date(3) }],
  distributions: [
    { id: "income", assetId: "fund", entitledAt: date(3), payOn: "2026-01-05", perUnit: 1, withheld: 2 },
  ],
};
export const receive = {
  kind: "receive",
  id: "income",
  at: date(5),
  revision: 1,
  basis: JSON.stringify(["fund", Date.parse(date(3)), "2026-01-05", 1, 2, "10/1"]),
} satisfies LedgerOperation;
export const reverse = {
  kind: "reverse",
  id: "income",
  at: date(9),
  revision: 1,
  receiptAt: receive.at,
} satisfies LedgerOperation;
export function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
