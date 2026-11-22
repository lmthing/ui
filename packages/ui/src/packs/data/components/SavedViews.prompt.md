## Purpose

Switch among named filter, sort and layout presets, and manage them.

## Pick

switching, saving or managing named query presets across records. Not ephemeral query controls (FilterBar), single-axis tags (Chips), or fixed screen tabs (Segmented).

## Writer

- Use distinct preset IDs, and set activeId only to an existing preset ID. Never write matching counts; code counts dataset matches. Use style "list" for readable descriptions and remove controls.
- Use detail "brief" for list rows without filter summaries or layout captions; keep the summaries and layout in the data. Leave unrequested axes null.
