# catalog/prompt

Turns definitions into the compact text a model reads. Read plan 4.9 first.

Files:
- `entry.ts`, `entry.test.ts`: `buildEntry(def)`, preserving recorded write entries and component write hints.
- `block.ts`, `block.test.ts`: `buildBlock(registry, scope)`, core snapshot and fixture pack budgets.
- `pack-index.ts`, `pack-index.test.ts`: `buildPackIndex(packs, options, isPackReady)`, lines from the shared meta index.
- `estimate-tokens.ts`, `estimate-tokens.test.ts`: deterministic four-code-points-per-token estimate.
- `index.ts`: folder exports.

Rules:
- Blocks use catalog group order, then id; pack indexes use id order. No timestamps.
- Code-owned components never appear in choice blocks. Registries supply pack membership.
- Probe choices keep their recorded order; write entries keep their recorded text.
- Generated entries bind readiness to `buildPackIndex(options)`; only ready packs appear by default.
- `includeDrafts: true` lists all 27 indexed packs, even without scaffolds; pack-pick probe prompts never depend on scaffold membership.
- Budgets: core under 3,500, each pack under 1,200, core plus any 3 packs under 7,000 estimated tokens.
