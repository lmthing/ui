# apps/site/scripts

- `build.ts`: the command; reads flags, takes screenshots, writes the site. `tools/`: dev helpers.
- `plan-docs.ts`, `recordings.ts`: build waves, planned components, recorded model replies.
- `site-types.ts`, `site-data.ts`: the data the pages draw, read from the catalog and the pack docs.
- `pack-table.ts`: reads the pack index table in `docs/catalog/packs/README.md`.
- `run-gallery.ts`: runs `gallery:static` into the cache. `theme-shots.ts`: shoots the theme showcase.
- `write-site.ts`: writes pages and copies shots into `dist/`.
- `page/`: section renderers (pure functions returning HTML strings), `style.ts`, `script.ts`.
