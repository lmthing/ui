# entries

Entry generation helpers, used by `../build-entries.ts`.

Files:
- `scan-entries.ts` discovers and validates components, pack metadata and archetype exports.
- `scan-entries.test.ts` checks pack paths, missing metadata and collisions.
- `generate-entries.ts` writes catalog, renderer and kit entries with membership and example strings.
- `generate-entries.test.ts` exercises temporary pack fixtures and invalid paths.
- `index.ts` the folder's door.

The scanner imports the pure catalog door to bootstrap without generated entries.
Pack metadata never imports components; generated entries collect them.
Generated catalog wrappers share `packReady(id)` for registry and pack-index gating.
`includeDrafts` keeps entire packs available to probes, gallery and look.
