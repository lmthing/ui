## Purpose

Browse saved books, shows or albums and see progress and new releases.

## Pick

The media the person has saved to read or play, shown as cover tiles with per-title progress and new episode badges. Not a grid of photos (Gallery), a shelf of suggestions (List), or things owned (Things).

## Writer

- Default to "aspect":null,"detail":null. Set aspect only if a crop is explicitly requested; do not infer it from the type of media.
- When asked to hide bylines, change only "detail":"brief"; leave aspect null. Keep progress as a fraction and badges as short authored text.
- For the usual cover grid leave arrange and style null. If asked for a grid, vertical list, or sideways shelf, set arrange to "grid", "rows", or "strip" respectively. For a loan list use style "loans" and arrange "rows"; loans puts status and due labels first regardless of arrangement. Copy each supplied status and dueLabel onto its own item.
