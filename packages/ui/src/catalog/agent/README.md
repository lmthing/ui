# catalog/agent

Reading screens as compact text and the action vocabulary. Needs no browser, so the server uses it too.

Built in step U1. Read plan 4.12 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):

- `actions.ts` the vocabulary (`press`, `toggle`, `check`, `select`, `type`, `set`, `increment`, `decrement`, `swipe`, `start`, `stop`)
- `validate-value.ts` `validateActionValue`
- `default-reader.ts` reader generated from the schema
- `read-screen.ts` `readScreen(screen, registry, opts)`
- `read-app.ts` `readApp` outline
- `format.ts` the line format
- `diff.ts` deltas for `since`
- `index.ts`

Rules:

- Output format is in plan 4.12. Text a model or person wrote is always in double quotes, inner quotes escaped.
- Budgets, checked in CI: a typical screen at most 300 tokens, an outline at most 15 tokens per screen.
- No pixels, colours, fonts or class names in any read.
