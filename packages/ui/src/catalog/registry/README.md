# catalog/registry

A scoped view of the catalog: the core plus the given packs.

Built in step U1. Read plan 4.6 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `create-registry.ts`, `create-registry.test.ts`: `registryOf`, scope options and tests
- `scope.ts` alias resolution inside one scope
- `index.ts`

Rules:

- API: `get`, `resolve`, `schema`, `archetypes`, `surfaces`, `ids`. See plan 4.6.
- `includeDrafts` defaults to false. Only the bake-off sets it to true.
- Two aliases resolving to different ids in one scope fail `catalog:check`.
- Reads the generated `entry/catalog.ts`. Never imports component files.
