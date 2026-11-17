# kit/archetypes

Default screens shown while a Writer works.

Built in step U2. Read plan 5.7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `default-lines.ts` `defaultLines(archetype, layout, cast)`
- one layout file per archetype, named like `catalog/archetypes` (`home.ts` ... `chat.ts`)
- `index.ts`

Rules:
- Built from the catalog's defaults and each component's `fallback`. Never invent content here.
- `home` in U2, the rest with their archetypes in U4 and U6.
