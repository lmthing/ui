# Interaction actions

`index.ts` exposes the action-name table and staged transition types.
Handlers return new state and deferred effects; they do not commit to the store.
`confirmationFor` checks declared component and item parts before any handler runs.
`families/` holds confirmations, playback, navigation, control values,
and staged replies/photo requests with adjacent tests.
