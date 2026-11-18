# catalog/props

Shared prop helpers. They implement the vocabulary that is the same on every component.

Built in step U1. Read plan 4.2 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `text.ts` `text(max)`: trimmed string with a limit
- `icon.ts` enum of the curated icon names
- `photo.ts` `lib:<tag>` or `local:<n>`, never a URL
- `screen-id.ts` a slug or `back`
- `date.ts` `isoDate` (YYYY-MM-DD, real) and `clock` (HH:MM)
- `tone.ts` `plain`, `accent`, `soft`, `good`, `warn`, `bad`
- `index.ts`

Rules:

- Each helper carries metadata the prompt builder reads (limit, enum values). Keep it on the schema.
- No helper accepts a URL, HTML or code.
- Vocabulary table in plan 4.2 is the contract: `tone`, `style`, `kind`, `icon`, `photo`, `goto`.
