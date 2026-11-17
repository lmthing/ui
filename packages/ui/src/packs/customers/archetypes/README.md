# packs/customers/archetypes

Archetype data files of the `customers` pack.

Built in step U3 (drafts), then U5. Read `docs/catalog/packs/customers.md` and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `clients.ts`
- `client.ts`
- `invoice.ts`
- `reputation.ts`

Rules:
- Data only, `satisfies ArchetypeMeta`. Defaults must pass `checkScreen`. At least 2 archetypes per pack.
- File names are kebab-case, ids are snake_case.
