## Purpose

Identify the person, pet or plant whose screen this is.

## Pick

An identity block with a name, short detail and optional portrait. Not a screen title or navigation (Header), or a summary to open another thing (Card).

## Writer

- Put a supplied portrait reference in `photo`. A portrait in the usual layout, even at the top of the page, uses `"media": null`. The default already shows the portrait, so do not write `"media": "thumb"` just because `photo` is filled.
- Set a non-null `media` only for an explicit photo treatment: `thumb` for a requested thumbnail or photo-led profile, `none` to hide the portrait slot. Otherwise leave `media` null.
- If the request hides only the supporting line, set `"detail": "brief"` and keep the supplied text in `meta`. Leave `media` null unless the request separately changes the portrait treatment.
