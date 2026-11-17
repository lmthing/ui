# packs/mind/archetypes

Archetype data files of the `mind` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/mind.md` and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `checkin.ts`
- `settle.ts`
- `insights.ts`
- `sleep.ts`

Rules:
- Data only, `satisfies ArchetypeMeta`. Defaults must pass `checkScreen`. At least 2 archetypes per pack.
- File names are kebab-case, ids are snake_case.
