## Purpose

Know an action worked, with its result and the saved item's details.

## Pick

A standalone moment after an action worked, with a result title and optional detail. Not an ongoing status or urgent warning at the top (Banner), or a screen with no content yet (Empty).

## Writer

- For a regular confirmation, write style:null and undo:null. Use style "toast" only for an explicitly requested small bottom message or undo. Never offer undo unless requested.
- When asked to keep a subtitle but show the title without it, write detail:"brief" and put the exact subtitle in sub. Leaving detail null would show sub. Otherwise use detail:null; if the person asks for details underneath the title, put that visible text in sub.
- Use a `success` slot in `photo` only on the full success screen for a tangible outcome; omit it from toasts and keep confirmation copy outside the image. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
