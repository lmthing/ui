# scripts/look/static-gallery

`pnpm gallery:static --out <dir> [--component A,B | --all]` exports the gallery as a static page that
can be published (for example as a Claude artifact): `index.html` plus two JPEGs per component in
`shots/` (the first preview, and every example and state in the calm preset, light and dark).

- `entries.ts`: the components listed (core and packs, drafts included) and each one's source file.
- `shoot.ts`: starts the gallery on a free port and takes the images in headless Chrome.
- `page.ts`, `page-style.ts`: the page, coloured from the kit's calm/moss theme roles.
- `run.ts`: the command. It keeps `manifest.json` in `<dir>` and shoots only what changed, then prints
  `GALLERY-FILE` lines for new or changed images and `GALLERY-PAGE` for the page.
