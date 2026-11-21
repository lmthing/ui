# packs/money

Pack `money`: The person's own money: balances, budgets, bills, splitting costs, debts and repayment plans.

Built in step U7 (drafts in U3), wave 2 of the catalog plan. Read `docs/catalog/packs/money.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `AccountCard.tsx` `Transactions.tsx` `Bills.tsx` `Split.tsx` `AmountPad.tsx` `PriceChart.tsx` `Loan.tsx` `Payoff.tsx` `CardControls.tsx` `MoneyTransfer.tsx` `CreditScore.tsx`
- `archetypes/`: `wallet.ts` `budget.ts` `entry.ts` `split.ts` `invest.ts` `debt.ts`

Rules:

- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
