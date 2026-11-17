# packs/content/archetypes

Archetype data files of the `content` pack.

Built in step U3 (drafts), then U7. Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `article.ts`
- `player.ts`
- `library.ts`

Rules:
- Data only, `satisfies ArchetypeMeta`. Defaults must pass `checkScreen`. At least 2 archetypes per pack.
- File names are kebab-case, ids are snake_case.
