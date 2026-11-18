# kit/screen

`PhoneScreen` is exported from `@lmthing/ui/kit`. It takes a `ScreenLike`, theme, optional part registry,
photo and media resolvers, and host `onLink` / `onAction` callbacks. The generated entry supplies the
catalog definitions and renderers; source components depend only on kit bases.

Top and bottom regions stay pinned; the body scrolls. A single `Sheet` is hidden until a `goto: sheet`
action opens it. Sheets and confirmation panels render over the screen, contain keyboard focus,
dismiss with Escape or a backdrop press, and restore focus to the opener.

`onReady` receives the agent API, also mounted at `window.__lmthingUI` in the browser. Agent actions and
taps use the same controller. Covered controls cannot act, and confirmation defers the original action
until `confirm/confirm press`; `confirm/cancel dismiss` cancels it.

Use `resolveMedia(reference)` to map a catalog media reference to a browser recording. A native host
supplies `MediaAdapter` with play, pause, seek and disposal operations, and optional `content` for its native video surface. Media time and playback events
update the screen; leaving the screen releases the adapter.

Files: `PhoneScreen.tsx`, `Screen.tsx`, `index.ts`. Runtime regression tests are in
`src/kit/interact/controller.test.ts` and `test/runtime.test.ts`.

## Live state and native hosts

`interaction` accepts a host-owned store; otherwise one store is retained per screen id. `onChange`
receives the current screen and values for persistence, `onSend` receives complete reply text, and
`requestPhoto` resolves a picker request to a logical photo reference. Long replies are clipped only
in the compact Bubbles presentation; `onSend` receives the complete text.

`nativeHost` supplies keyboard/inset/accessibility snapshots, Android back handling, modal focus and
focused-input scrolling. Web hosts observe the visual viewport, CSS safe-area insets and reduced-motion
media query. `interactive: false` rejects acts; `agentMode` settles motion immediately. `signature` and
`cue` select and trigger one of the ten optional signature reveals.
