# entry

Generated files. Never edit by hand. Regenerate with `pnpm build:entries` (`scripts/build-entries.ts`).

Files:
- `catalog.ts` exposes component data, `packOf`, `packs`, `packArchetypes`, inlined `packExamples`, `packReady(id)`, scoped `createRegistry`, and `buildPackIndex(options)`.
- `renderers.ts` maps each id to its view (the export named by the PascalCase id). Draft files are skipped.
- `kit.ts` the public surface of the kit entry.

Rules:
- The catalog entry is built with react, react-native, tamagui and everything under `src/kit` replaced by empty stubs, so views drop out.
- `scripts/bundle-check.ts` fails if the built catalog contains any of those names, or cannot build a registry in plain Node.
- The harness always imports the built catalog, never this source.
- Registry and pack-index wrappers share readiness; probes, gallery and look can request drafts.
- A non-draft component file without a view fails the conformance test.
- Plan: section 3, 10.
