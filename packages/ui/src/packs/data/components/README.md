# packs/data/components

Component files of the `data` pack.

Built in step U3 (drafts), then U7. Read plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Table.tsx`
- `Board.tsx`
- `FilterBar.tsx`
- `LineChart.tsx`
- `Donut.tsx`
- `Kpi.tsx`
- `Heatmap.tsx`
- `BulkActions.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, view.
- Draft files (`status: "draft"`) have no view yet.
