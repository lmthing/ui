# catalog/probes

Pure logic for the small-model tests of everything a model reads or writes. No I/O: the model call is injected.

Built in step U1 (first six components), U3 (all). Read plan 4.13 first.

Files (exactly these):

- `run.ts` `runProbes(probes, block, callModel)`: builds prompts, collects replies
- `score.ts` scores `choose`, `write` and `read` replies
- `composition/` builds/scores screens and constrains lines to recipe-scoped Writer ids
- `packs/` Director prompt, sampled runs and exact-set scoring (at most three ids)
- `fixtures/` component probe builders and shared example data
- `index.ts`

Rules:
- Kinds: `choose`, `write`, `read` per component; `compose` per archetype layout; `pack` per pack.
- `callModel(prompt, sample?, format?) => text` is injected; only write/compose calls receive a strict format.
- Gates in 4.13. Whole-app composition is tested in the harness, not here.
