# kit/screen

`PhoneScreen` takes a screen, theme, part registry, resolvers and host callbacks; the generated
entry supplies definitions and renderers. Top and bottom regions are pinned; the body scrolls.
Sheets and confirmations contain focus, dismiss with Escape, back or backdrop, and restore focus.

Only the selected host passes a stable `onReady`. `onReady={publishBrowserAgent}` opts into
`window.__lmthingUI`. The handle follows committed screen updates without republishing.
Return a cleanup to retract custom publication on deselection or unmount. Superseded hooks never restore.
`agentReadOnly` allows reads but rejects acts and ignores resets without changing human input.
An inert phone calls `onReady` only if the host explicitly opts into `agentReadOnly`.
Taps and agent actions share a controller; covered controls cannot act.
Confirmation defers the original action until `confirm/confirm press`; cancel dismisses it.
`interaction` accepts a host store; otherwise one store is retained per screen id.
`onChange` receives screen and values, `onSend` gets complete text, `requestPhoto` resolves references.
`resolveMedia` or a native `MediaAdapter` supplies local playback; unmount disposes it.
`nativeHost` supplies keyboard, insets, back, focus and visibility callbacks.
Web observes visual viewport, CSS safe areas and reduced motion. `interactive: false` rejects acts.
`agentMode` settles motion immediately; `signature` and `cue` select and trigger reveals.
