# catalog/rules

Screen rules are pure functions over `ScreenLike` and a registry. They report issues and never repair.

- `checks/` screen weight, limits, neighbours, placeholder and core-component checks
- `shared/` entry/issue types, registry lookup, addresses and stable region ordering
- `rhythm.ts` shared gap tokens
- `check-screen.ts`, `check-screen.test.ts` compose the screen checks in unchanged issue order
- `check-packs.ts`, `check-packs.test.ts` validate pack metadata and examples
- `index.ts` preserves the folder's public exports

Plan 4.5 is the contract. Issue codes are stable; repairing is the harness's job.
