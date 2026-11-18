# scripts/look/static-gallery

`pnpm gallery:static --out <dir> [--component A,B | --all]` exports the gallery as a static page that
can be published (for example as a Claude artifact): `index.html` plus two JPEGs per component in
`shots/` (the first preview, and every example and state in the calm preset, light and dark).

- `entries.ts`: the components listed (core and packs, drafts included) and each one's source file.
- `shoot.ts`: starts the gallery on a free port and takes the images in headless Chrome.
- `page.ts`: anchored cards and collapsible sections; `nav.ts`: overview, navigation and filters.
- `page-style.ts`: responsive cards/compact layouts, using calm/moss theme roles in light and dark.
- `page-script.ts`: filtering, hash sharing, sticky scroll tracking and compact expansion.
- Scope, status and search persist as `#?scope=packs&status=ready&q=time`; section/card anchors can
  precede the query. `/` focuses search and Esc clears it. Density persists in guarded localStorage.
- Expand/Collapse all affects sections; each card keeps its own Show all variants toggle.
- `run.ts`: the command. It keeps `manifest.json` in `<dir>` and shoots only what changed, then prints
  `GALLERY-FILE` lines for new or changed images and `GALLERY-PAGE` for the page.
