# kit/base/rich

Copyable source and equation blocks, staggered cards, and sequential panels.

- `KitCodeBlock` binds the original source to a declared `copy` action via `KitAction`.
- `KitMasonry` places aspect-ratio cards in two columns without reordering their content.
- `KitPanelStrip` scrolls gaplessly or snaps full-width pages; its optional target toggles caller-owned controls.

Each uses shared theme tokens, empty copy and static loading drawings. Import through `index.ts`.
