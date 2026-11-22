# packs/paperwork

Pack `paperwork`: Life admin: documents, renewals, receipts, forms to sign and deadlines.

Built in step U5 (drafts in U3), wave to be decided. Read `docs/catalog/packs/paperwork.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Documents.tsx` `Renewals.tsx` `Receipts.tsx` `Signature.tsx` `TaxYear.tsx` `ScanBatch.tsx`
- `archetypes/`: `vault.ts` `due_soon.ts` `sign.ts` `tax_prep.ts`

Rules:

- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
