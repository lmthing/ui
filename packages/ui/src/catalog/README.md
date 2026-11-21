# catalog

Everything that can be known without drawing: types, tokens, themes, rules, readers, prompt entries, registry. Imports only `zod`.

Built in step U1. Read plan 4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `meta/` `props/` `types/` `tokens/` `themes/` `archetypes/` `rules/` `address/` `lookup/` `lines/` `prompt/` `format/` `agent/` `probes/` `registry/` `migrations/`
- `icons.ts` curated icon names, `photos.ts` photo tags, `signatures.ts` signature ids and their component, `version.ts`, `index.ts`

Rules:

- Pure and synchronous. No React, no Tamagui, no `node:*` (that is for `scripts/` only), no I/O.
- `copy` accepts nonempty text at a declared part; the catalog validates it but the kit host writes the clipboard.
- Nothing runs at import time. All checks live in `scripts/check.ts`.
- Importing the built catalog stays under 50 ms in Node.
- Every folder has an `index.ts`. Only `catalog/index.ts` is public.
