# packs/books

Pack `books`: A small business's own accounts: income, expenses, profit, tax set aside.

Built in step U5 (drafts in U3), wave to be decided of the catalog plan. Read `docs/catalog/packs/books.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Ledger.tsx` `Expenses.tsx` `ProfitLoss.tsx` `VatReturn.tsx` `Payroll.tsx`
- `archetypes/`: `books_home.ts` `expenses.ts` `period_report.ts` `tax.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
