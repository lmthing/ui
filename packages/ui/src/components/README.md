# components

One file per core component, named by its PascalCase id, holding its data and its view.

Files (40, flat on purpose):
Header SectionTitle Steps TabBar Hero Card List KeyValue Note Photo Gallery Profile Banner Empty Stats Ring Bars Sparkline Timeline Calendar Counter Timer Field Chips Segmented Checklist Search Scale Button Actions Success Camera MapPins Bubbles People SwipeStack DayTimeline Streak Route Canvas (each `.tsx`)

A file exports exactly: `meta`, `props`, `fallback`, `examples`, `probes`, and a view function named like the file.
- `meta` is `as const satisfies Meta`. `props` is a Zod schema, every string has a limit, every array a maximum.
- `fallback` returns valid props from the cast. `examples`: two or more, validated by `catalog:check`. `probes`: model tests (plan 4.13).
- The view is a plain React function typed `Props<typeof props, typeof meta>`. `part="title"` stamps an address.
- A draft (`status: "draft"`) has no view. Template: plan 4.4. Table of components: plan 4.4.
- Flat on purpose (name equals id, the generator lists the folder). Each file has 2+ `choose`, 1 `write`, and `read` probes if it has actions.
- Built: U1 data of 6, U2 views, U3 drafts of the rest, U4 and U6 final.
