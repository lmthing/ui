# entry

Generated files. Never edit by hand. Regenerate with `pnpm build:entries` (`scripts/build-entries.ts`).

Files:

- `catalog.ts` wires unchanged public data, membership, pack maps and readiness/registry/index wrappers.
- `core.ts` and `surfaces.ts` hold component data and ready renderer maps.
- `packs/index.ts` combines groups; each `packs/group-N/` door combines at most nine generated pack files.
- Pack files import metadata, components, archetypes and example text only through the pack root door.
- `renderers.ts` combines ready views in core/pack/surface order; `kit.ts` wraps the public kit.

Rules:

- The catalog entry is built with react, react-native, tamagui and everything under `src/kit` replaced by empty stubs, so views drop out.
- `scripts/bundle-check.ts` fails if the built catalog contains any of those names, or cannot build a registry in plain Node.
- The harness always imports the built catalog, never this source.
- Registry and pack-index wrappers share readiness; probes, gallery and look can request drafts.
- A non-draft component file without a view fails the conformance test.
- Generated files obey the 200-line and 12-file folder limits and are audited by `pnpm rules`.
