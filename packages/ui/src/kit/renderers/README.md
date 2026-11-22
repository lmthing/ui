# Shared pack renderers

`SeatPlan` places grids, tables and owner-supplied summaries on the seat bases.
`StageBoard` draws counted columns or stacked lanes, optionally with approved move targets.
`FeedRow` and `DateRows` draw authored entries with optional content and date slots.

Use the `index.ts` door. Pass stamped ids and declared parts from the owning component.
These recipes do not define Writer schemas, live policies, or Director scope.
