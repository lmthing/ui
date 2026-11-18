# catalog/probes

Pure logic for the small-model tests of everything a model reads or writes. No I/O: the model call is injected.

Built in step U1 (first six components), U3 (all). Read plan 4.13 first.

Files (exactly these):

- `run.ts` `runProbes(probes, block, callModel)`: builds prompts, collects replies
- `score.ts` scores `choose`, `write` and `read` replies
- `confusion.ts` which wrong component won, per component
- `compose.ts` builds and scores whole-screen probes with `checkScreen`
- `rubric.ts` the text-first rubric (clarity, focus, flow, content, structure, 1 to 5)
- `index.ts`

Rules:

- Kinds: `choose`, `write`, `read` per component; `compose` per archetype layout; `pack` per pack.
- `callModel(prompt) => text` is passed in. `scripts/llm-check.ts` and the harness bake-off each supply their own.
- Gates in 4.13. Whole-app composition is tested in the harness, not here.
