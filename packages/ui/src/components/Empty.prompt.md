## Purpose

A calm message on a screen that has no content yet.

## Pick

Only when there is no content or no results yet, explaining their absence. Not the screen's main statement about what exists or needs attention (Hero), a separate warning or status notice (Banner), or a supporting sentence (Note).

## Writer

- An instruction to show just the title or hide the explanation sets detail to "brief"; retain the exact explanation in sub. If the explanation should be visible, write it in sub and set detail to null.
- Use kind "error" or "offline" only for a failed result or disconnected state; those provide a retry action.
- Use `photo` only for a dedicated empty or recovery moment: `empty_state` with `kind` `none`, or `error` with `kind` `error` or `offline`. Keep the explanation and recovery action in the component copy. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
