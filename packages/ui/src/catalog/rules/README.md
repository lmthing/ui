# catalog/rules

Screen rules. Pure functions over `ScreenLike` and a registry. They report issues and never repair.

Built in step U1. Read plan 4.5 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `regions.ts` `sortByRegion`
- `rhythm.ts` the gap table (8, 16, 24)
- `weight.ts` 3 to 9 components, weight at most 12, at most two weight-3
- `limits.ts` count limits read from the schemas
- `neighbours.ts` hero first, no two adjacent of one type except cards and fields, one primary action
- `placeholders.ts` rejected patterns
- `check-screen.ts` `checkScreen(screen, registry): Issue[]`
- `check-packs.ts`, `check-packs.test.ts`: pack metadata, examples, probes and component rules
- `index.ts`

Rules:

- The eight layout rules in plan 4.5 are the contract. Issue codes are stable (`S.weight_over`, `S.two_primaries`).
- Repairing is the harness's job. Return issues only.
