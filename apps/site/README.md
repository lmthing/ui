# apps/site

The public landing site for lmthing/ui, published on GitHub Pages. Static HTML and CSS, almost no JS,
generated from the repo at build time so it never goes stale.

- `pnpm site` builds into `apps/site/dist` (add `--out <dir>` to choose another, `--all` to re-shoot every
  screenshot, `--no-shots` to skip screenshots and reuse the cache).
- Facts come from the built catalog (`@lmthing/ui/catalog`) and `docs/catalog/packs/README.md`. Screenshots
  come from `pnpm gallery:static` (every component) and `scripts/theme-shots.ts` (the theme showcase).
- `.cache/` holds shots and manifests between runs (CI caches it); `dist/` is the output.
- `scripts/`: build steps. `scripts/page/`: one file per page section, plus style and script.
- `.github/workflows/pages.yml` rebuilds and deploys on every push to `main`.
