## Purpose

One thing with a little detail, optionally tappable to open it.

## Pick

A compact preview of one thing, with a title and short detail, optionally opening it. Not several separate things to scan (List) or the screen's main headline (Hero).

## Writer

- Use null for every unrequested Card axis. Ordinary photos, icons and status text go in the content fields; they do not request a cover, tint or hidden detail.
- A wide photo above the text changes media to cover only; leave other axes null unless explicitly requested.
- Leave detail null for short copy; use brief only when asked to hide the body and meta. Keep both in the data.
- Use badge for a short corner status. Put reward and duration pills in their own fields, using the requested wording verbatim (for example, keep "20 points", not "20 pts").
- For a generated image that helps identify the record, use an accepted kind in `photo` and omit the icon. Keep `media` null for a normal thumbnail, or use `cover` only when the art leads. Preserve supplied photos. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
