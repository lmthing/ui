# catalog/registry

A scoped view of the catalog: the core plus the given packs.

Built in step U1. Read plan 4.6 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `create-registry.ts`, `create-registry.test.ts`: `registryOf`, scope options and tests
- `pack-ready.ts`, `pack-ready.test.ts`: pure readiness gate over generated metadata and examples
- `index.ts`

Rules:

- API: `get`, `resolve`, `schema`, `archetypes`, `surfaces`, `ids`. See plan 4.6.
- `includeDrafts` defaults to false; probes, gallery and look opt in to whole draft packs.
- Packs need metadata, a component, every component explicitly ready, and valid example lines.
- `registryOf` receives a readiness predicate from generated entries; absent readiness excludes packs.
- Resolution tries exact ids, case/separator-insensitive ids, then scoped migration names.
- Generated entries bind `packReady(id)` and `createRegistry`; helpers never import component files.
