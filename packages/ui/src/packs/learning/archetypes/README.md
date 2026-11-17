# packs/learning/archetypes

Archetype data files of the `learning` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/learning.md` and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `course.ts`
- `lesson.ts`
- `results.ts`
- `planner.ts`

Rules:
- Data only, `satisfies ArchetypeMeta`. Defaults must pass `checkScreen`. At least 2 archetypes per pack.
- File names are kebab-case, ids are snake_case.
