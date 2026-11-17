# @lmthing/ui

The one published package. Two entries: `catalog` (no React) and `kit` (React, Tamagui). Each component is ONE file holding its data and its view.

Built in step U0. Read plan 3 and 10 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `src/catalog/` knowledge, `src/components/` core components, `src/packs/` domain packs, `src/surfaces/` outside-the-app moments
- `src/kit/` React infrastructure, `src/entry/` generated entries, `scripts/`, `assets/fonts/`, `test/`

Rules:
- `src/catalog` imports only `zod`. `src/kit` imports `src/catalog` and peers. Components, packs and surfaces import both.
- Nothing in `src/catalog` may import `src/kit`, React, Tamagui or anything under `src/components`.
- `package.json` `exports`: `./catalog` (built, no `source` condition), `./kit` (with a `source` condition).
