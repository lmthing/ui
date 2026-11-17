# components

One file per core component, named by its PascalCase id, holding its data and its view.
How to write one: `docs/component-guide.md`. Reference: `List.tsx` and `List.test.ts`.

Files (40, flat on purpose):
Header SectionTitle Steps TabBar Hero Card List KeyValue Note Photo Gallery Profile Banner Empty Stats Ring Bars Sparkline Timeline Calendar Counter Timer Field Chips Segmented Checklist Search Scale Button Actions Success Camera MapPins Bubbles People SwipeStack DayTimeline Streak Route Canvas (each `.tsx`)

- A file exports exactly: `meta`, `props`, `fallback`, `examples`, `probes`, and a view named like the file.
- Imports only `zod`, `../catalog`, `../kit`. Views use kit bases only; no literal text, no raw values.
- `fallback` uses `catalog/cast` helpers and placeholders. Empty and loading use `emptyLine` and `KitSkeleton`.
- Each file has a `<Id>.test.ts` beside it and committed recordings in `test/recordings/<Id>/`.
- A component is done only when `pnpm llm:check --component <Id>` passes on every required model.
- Entries, renderers, conformance tests and the gallery find new files automatically.
- Built: U1 data of 6, U2 views, U3 drafts of the rest, U4 and U6 final.
- Planned: 6 new, 2 merges and new options on 13: `docs/catalog/core.md` (steps C1 to C4).
