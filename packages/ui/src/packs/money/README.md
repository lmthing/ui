# packs/money

Pack `money`: Budgets, bills and splitting costs.

Built in step U7 (drafts in U3). Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Balance.tsx` `Transactions.tsx` `Budget.tsx` `Split.tsx` `Bill.tsx`
- `archetypes/`: `wallet.ts` `budget.ts`

Rules:
- Component list is a proposal, finalised in U3. Component ids are PascalCase and equal the file names.
- Tiers: payments and sending to customers are `service`, a customer's view is `people`. Every component needs a `realPath`.
- Each component ships with two examples, renderers in its own file, and an entry in the worked example.
