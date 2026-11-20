# src/tryit/openrouter

Tier 3: one of OpenRouter's free models, called from this browser with the visitor's own key.

- `connect.ts` + `pkce.ts`: OpenRouter's PKCE sign-in. `startConnect` sends the visitor to openrouter.ai;
  `finishConnect` (called in `main.tsx` before the first render) trades the returned code for a key.
- `key.ts`: the key in localStorage only, a masked form for display, and a plausibility check for pastes.
- `models.ts`: the live free text models from the public model list, ranked by how strictly each can be
  held to the screen's JSON Schema (strict schema, JSON mode, instructions only).
- `engine.ts`: streamed chat completions; failures carry a kind (key, quota, model) so the panel can say
  what to do, then fall back to the recorded replay.
- `useOpenRouter.ts`: the panel's state. The site never holds a key of its own and never names a model.
