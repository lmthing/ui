# packs/money/components

Component files of the `money` pack. Read `docs/catalog/packs/money.md` and plan 4.2 and 4.4.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `AccountCard.tsx`
- `Transactions.tsx`
- `Bills.tsx`
- `Split.tsx`
- `AmountPad.tsx`
- `PriceChart.tsx`
- `Loan.tsx`, `Payoff.tsx`
- `CardControls.tsx`
- `MoneyTransfer.tsx`
- `CreditScore.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
