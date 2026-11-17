# kit/interact

Interaction state, the dispatcher and agent access. A human touch and an agent action run the same code.

Built in step U2. Read plan 5.9 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `dispatcher.ts` `dispatch(address, action, value?)`
- `action-registry.ts` parts register `{ screen, rev, address, actions, enabled }`
- `interaction-store.ts` `createInteractionStore`
- `settle.ts` no animation, no pending layout or report, gives up after 2 s
- `agent-access.ts` `createAgentAccess`: `read`, `act`, `log`, `reset`
- `a11y.ts` roles, labels, hidden decoration
- `index.ts`

Rules:
- `dispatch` validates with `validateActionValue`. With `interactive={false}` it refuses with `not_interactive`.
- Renderers stay pure: they read values through `value(part)`. Never set state in a view.
- `act` checks `expectRev`, scrolls into view, dispatches, settles, returns what changed in one call.
- The kit never touches `window`. Hosts expose the hook. Details: plan 5.9.
