# scripts/llm

The text views of the site for models, written into `dist/` by `build.ts`. Everything comes from the built
catalog, the pack docs, the worked examples and the recordings, so nothing can drift.

- `index.ts`: `buildLlmFiles` (path to content) and `writeLlm`. `validate.ts` fails the build if an example
  does not validate against the catalog.
- `component-md.ts`, `pack-md.ts`, `pages-md.ts` (writing, reading, themes, index): the Markdown pages.
- `llms-txt.ts`: `llms.txt` (links only) and `llms-full.txt` (every page, in order). `json-files.ts`:
  `catalog.json` and `components.json`.
- `catalog.ts`, `props-table.ts`, `md.ts`: catalog access, the props table, small Markdown helpers.
- `SITE_URL` overrides the absolute base used in links (default https://lmthing.github.io/ui/).
