# catalog/migrations

Pure functions from an old spec shape to the new one, one per major catalog version.

Built in step when needed (after U4). Read plan 4.11 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `index.ts` `migrate(spec)`, plus one file per major version (`v2.ts`, `v3.ts`, ...)

Rules:
- Shape: a pure function over `{ catalog, screens: Record<string, ScreenLike> }` with fixture tests.
- A removal, rename, tightened limit or changed meaning is a major version and needs a migration.
- Empty until the first major bump.
