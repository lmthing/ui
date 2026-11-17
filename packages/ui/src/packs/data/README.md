# packs/data

Pack `data`: Running things behind the scenes.

Built in step U7 (drafts in U3). Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Table.tsx` `Board.tsx` `FilterBar.tsx` `LineChart.tsx` `Donut.tsx` `Kpi.tsx` `Heatmap.tsx` `BulkActions.tsx`
- `archetypes/`: `admin-list.ts` `report.ts` `board.ts`

Rules:
- Component list is a proposal, finalised in U3. Component ids are PascalCase and equal the file names.
- Tiers: payments and sending to customers are `service`, a customer's view is `people`. Every component needs a `realPath`.
- Each component ships with two examples, renderers in its own file, and an entry in the worked example.
