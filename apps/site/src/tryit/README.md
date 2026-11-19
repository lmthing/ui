# src/tryit

"Try it live": a model in the visitor's browser writes one screen from a small slice of the real catalog.

- `scope.ts`: about ten core components plus at most one live pack, and `linesSchema` from `writerFormat`.
- `prompt.ts`: the short prompts (write, act). `assemble.ts`: closed lines out of streamed text, then
  catalog validation with small repairs, each reported as a badge. `act.ts`: real address/action pairs.
- `useEngines.ts` (which tier), `useTryIt.ts` (a run), `engines/` (Chrome AI, WebLLM, replay).
- `panel/`: `TryPanel` with `TierBar`, `CodePane`, `ActPane`.
