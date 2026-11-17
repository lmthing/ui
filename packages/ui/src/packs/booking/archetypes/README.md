# packs/booking/archetypes

Archetype data files of the `booking` pack.

Built in step U3 (drafts), then U5. Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `book.ts`
- `appointments.ts`
- `schedule.ts`

Rules:
- Data only, `satisfies ArchetypeMeta`. Defaults must pass `checkScreen`. At least 2 archetypes per pack.
- File names are kebab-case, ids are snake_case.
