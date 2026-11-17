# src

Everything the package ships. One folder per concern, nothing else.

Folders (exactly these):
- `catalog/` data and pure code, no React (U1)
- `components/` one file per core component, data plus view (U1 data, U2 views, U4 and U6 final)
- `packs/` one folder per domain pack (U3 drafts, U5 and U7 final)
- `surfaces/` LockScreen, Widget, Message (U6)
- `kit/` React infrastructure the views use (U2)
- `entry/` generated entry files, never edited (U0)

Rules:
- Import direction: `catalog` <- `kit` <- `components`, `packs`, `surfaces`. Never the other way.
- Other folders import a folder only through its `index.ts`.
- Plan: section 3.
