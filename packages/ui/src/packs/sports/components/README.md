# packs/sports/components

Component files of the `sports` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/sports.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Fixtures.tsx`
- `Scoreboard.tsx`
- `Standings.tsx`
- `Lineup.tsx`
- `MatchFeed.tsx`
- `Squad.tsx`
- `Bracket.tsx`
- `MatchStats.tsx`
- `BoxScore.tsx`
- `MomentumChart.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
