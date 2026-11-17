# catalog/archetypes

Screen patterns. Data only: a recipe of slots and a finished default screen per layout.

Built in step U1 (`home`), the rest in U4 and U6. Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `home.ts` `dashboard.ts` `list.ts` `detail.ts` `form.ts` `checklist.ts` `calendar.ts` `tracker.ts` `journal.ts` `profile.ts` `settings.ts` `success.ts` `onboarding.ts` `capture.ts` `chat.ts`
- `index.ts`

Rules:
- `as const satisfies ArchetypeMeta`. Layouts and default recipes come from the archetype table in plan 4.4.
- `defaults` must pass `checkScreen`. Each file also exports `probes`: one `compose` probe per layout (plan 4.13).
- Archetype ids stay lowercase snake_case. Component names inside recipes are PascalCase.
