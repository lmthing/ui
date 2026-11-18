# catalog/rules

Screen rules are pure functions over `ScreenLike` and a registry. They report issues and never repair.

- `checks/` screen weight, limits, neighbours, placeholder and core-component checks
- `shared/` entry/issue types, registry lookup, addresses and stable region ordering
- `rhythm.ts` shared gap tokens
- `check-screen.ts`, `check-screen.test.ts` compose the screen checks in unchanged issue order
- `check-packs.ts`, `check-packs.test.ts` validate pack metadata and examples
- `check-archetypes.ts`, `check-archetypes.test.ts` validate core/pack ids, layouts and scoped recipes
- Layout ids are record keys, unique within their archetype; archetype ids may equal component ids.
- Core defaults are per-layout; packs explicitly name `defaultLayout`.
- `dense-ids.ts`, `dense-ids.test.ts` cover pack-guide density exemptions, including all 27 packs
- Pack ownership comes from generated `packOf` (components) and `packArchetypes` (archetypes).
- `pnpm test` checks both families against the complete generated catalog, including drafts.
- `index.ts` preserves the folder's public exports

Plan 4.5 is the contract. Issue codes are stable; repairing is the harness's job.
