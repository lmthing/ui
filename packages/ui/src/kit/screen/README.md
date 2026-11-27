# kit/screen

`PhoneScreen` takes a screen, theme, part registry, resolvers and host callbacks.
The generated entry supplies catalog definitions and renderers; component imports stay unchanged.
Top and bottom regions are pinned; the body scrolls. Sheets and confirmations contain focus,
dismiss with Escape, back or backdrop, and restore focus to the opener.

Only the selected host passes `onReady`. `onReady={publishBrowserAgent}` opts into `window.__lmthingUI`;
custom callbacks can return a cleanup to retract access on screen change or unmount.
A later publication supersedes an earlier one without restoring it on cleanup.
`agentReadOnly` allows reads but rejects acts and ignores resets without changing human input.
An inert phone does not call `onReady` unless the host explicitly opts into `agentReadOnly`.
Taps and agent actions share a controller; covered controls cannot act.
Confirmation defers the original action until `confirm/confirm press`; cancel dismisses it.
`interaction` accepts a host store; otherwise one store is retained per screen id.
`onChange` receives screen and values, `onSend` gets complete text, `requestPhoto` resolves references.
`resolveMedia` or a native `MediaAdapter` supplies local playback; unmount disposes it.
`nativeHost` supplies keyboard, insets, back, focus and visibility callbacks.
Web observes visual viewport, CSS safe areas and reduced motion. `interactive: false` rejects acts.
`agentMode` settles motion immediately; `signature` and `cue` select and trigger reveals.

Files: `PhoneScreen.tsx`, `Screen.tsx`, their small helpers, and `index.ts`.
Runtime tests: `test/runtime.test.ts` and `kit/interact/controller.test.ts`.
