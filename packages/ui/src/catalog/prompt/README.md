# catalog/prompt

Turns definitions into the compact text a model reads.

Built in step U1 (entry), U3 (all). Read plan 4.9 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `entry.ts` `buildEntry(def)`: two lines, each under 70 tokens
- `block.ts` `buildBlock(registry, scope)`
- `pack-index.ts` `buildPackIndex()`: one line per pack
- `index.ts`

Rules:
- Deterministic: fixed order by group then id, no timestamps, so prompt caching holds.
- Budgets: core block under 3,500 tokens, each pack block under 1,200, core plus any 3 packs under 7,000.
- Snapshot test for every block. A diff shows exactly what changes in the model's view.
