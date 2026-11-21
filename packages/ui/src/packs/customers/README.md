# packs/customers

Pack `customers`: A business keeping track of the people it serves.

Built in step U5 (drafts in U3), wave 1 of the catalog plan. Read `docs/catalog/packs/customers.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `ClientCard.tsx` `ClientHistory.tsx` `Invoice.tsx` `PaymentStatus.tsx` `Loyalty.tsx` `Agreement.tsx` `FollowUpQueue.tsx` `SavedItems.tsx`
- The worked example and archetypes also use core `Review` (no pack-owned export).
- `archetypes/`: `clients.ts` `client.ts` `invoice.ts` `reputation.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
