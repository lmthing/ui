## Purpose

See measured progress toward one or more targets.

## Pick

One or more measured amounts against their own targets, whether bars or a single circular goal. Not concentric daily goals (ActivityRings), amounts compared with each other (Bars), independent summary numbers (Stats), or position in an ordered flow (Steps).

## Writer

- Use style "ring" for one circular goal. Put its label (up to 24 characters), value and of in one bars entry. Leave unit, tone and goto null. Set style "bars" for requested bars or null for an ordinary ratio; either way, shorten every horizontal bar label to at most 20 characters.
- A request to hide the ring caption explicitly asks for "detail":"brief". Set it and keep the caption text verbatim in sub, for example {"detail":"brief","sub":"3 to go"}. If hiding the caption is not requested, leave detail null.
- For a ring, always set figures to null. Use emphasis "hero" only for a large focal ring. Send null for all other unrequested axes and row options.
- Set figures to "short" only to abbreviate bar counts without changing stored numbers. A bar crossing a target does not by itself request a special tone.
