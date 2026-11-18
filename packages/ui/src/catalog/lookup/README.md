# catalog/lookup

Small pure helpers so every host repairs model output the same way.

Built in step U1. Read plan 4.6 and 4.7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `aliases.ts` `lookupAlias(registry, name)`: ignores case and separators
- `nearest-icon.ts` edit distance plus synonyms, then the neutral `dot`
- `nearest-tag.ts` same over `photos.ts`
- `clamp.ts` `clampText(value, max)` at a word boundary
- `snap-enum.ts` `snapEnum(value, values)`
- `index.ts`

Rules:

- `service_menu`, `servicemenu` and `Service-Menu` all resolve to `ServiceMenu`.
- An exact id always wins over an alias. A core alias never shadows a pack component the registry includes.
- Table-driven tests for each helper.
