## Purpose

Identify the person, pet or plant whose screen this is.

## Pick

An identity block with a name, short detail and optional portrait. Not a screen title or navigation (Header), or a summary to open another thing (Card).

## Writer

- Put the portrait reference in `photo`. In the usual layout use `"media": null`, even with a supplied portrait or a profile at the top of the page. The default already shows the portrait.
- Use `"media": "thumb"` only for an explicitly requested thumbnail or photo-led treatment. Use `"media": "none"` only if asked to hide the portrait. Never use `none` when the request says to show a picture.
- Put supplied supporting text in `meta`. To show it, use `"detail": null`, including in a photo-led profile. Use `"detail": "brief"` only on an explicit request to hide the supporting line, and keep that text in `meta`. Hiding the supporting line alone leaves `media` null.
- Use an `avatar` image slot only for a fictional illustrated person; use `pet` or `plant` for those profiles. Preserve supplied photo references for real records. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
