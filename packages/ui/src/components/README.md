# components

One file per core component, named by its PascalCase id, holding its data and its view.
How to write one: `docs/component-guide.md`. Reference: `List.tsx` and `List.test.ts`.

Files (45, flat on purpose):
Header SectionTitle Steps TabBar Hero Card List KeyValue Note Photo Gallery Profile Banner Empty Stats Bars Sparkline Timeline Calendar Counter Timer Field Chips Segmented Checklist Search Scale Button Actions Success Camera MapPins Bubbles People SwipeStack Streak Route Canvas Progress Amount Choice Composer Sheet Player (each `.tsx`)

- A file exports exactly: `meta`, `props`, `fallback`, `examples`, `probes`, and a view named like the file.
- Meta contains no component aliases; Writers are constrained by the scoped catalog format.
- Imports only `zod`, `../catalog`, `../kit`. Views use kit bases only; no literal text, no raw values.
- `fallback` uses `catalog/cast` helpers and placeholders. Empty and loading use `emptyLine` and `KitSkeleton`.
- Each file has a `<Id>.test.ts` beside it and committed recordings in `test/recordings/<Id>/`.
- A component is done only when `pnpm llm:check --component <Id>` passes on every required model.
- Entries, renderers, conformance tests and the gallery find new files automatically.
- Built: U1 data of 6, U2 views, U3 drafts of the rest, U4 and U6 final.
- Built: the six new schemas/views and the options of C1 to C3. Browser runtime for sheets, confirmation and media is verified.
- Built: live controls, navigation counts, rules and 17 archetypes; DayTimeline is now Timeline[hours]. Compose/rubric and browser motion/visual gates pass. Remaining acceptance: native device QA; see `docs/catalog/core.md`.
