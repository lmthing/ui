## Purpose

See measured progress toward one or more targets.

## Pick

One or more measured amounts against their own targets, whether bars or a single circular goal. Not concentric daily goals (ActivityRings), amounts compared with each other (Bars), independent summary numbers (Stats), or position in an ordered flow (Steps).

## Writer

- Use only a measured value and its actual total. For project progress use the whole project, not a selected piece, count of filled fields or guessed status. When a recipe requires Progress but measurements are absent, use bars: [] and sub: null.
- Use style "ring" for one circular goal. Put its label (up to 24 characters), value and of in one bars entry. Leave tone and goto null. Set style "bars" for requested bars or null for an ordinary ratio; either way, shorten every horizontal bar label to at most 20 characters.
- Include the supplied unit for each goal (up to 16 characters). When the same measured goal has a due date, include it in due (YYYY-MM-DD) and always supply unit. Remaining work is calculated from of minus value; do not repeat the date or amount remaining in sub.
- A request to hide the ring caption explicitly asks for "detail":"brief". Set it and keep the caption text verbatim in sub, for example {"detail":"brief","sub":"3 to go"}. If hiding the caption is not requested, leave detail null.
- For a ring, always set figures to null. Use emphasis "hero" only for a large focal ring. Send null for all other unrequested axes and row options.
- If a bar brief asks for compact numbers, abbreviations, or examples like 4.2K and 6K, set figures to "short" and keep the exact numeric values in value and of. Otherwise leave figures null. Crossing a target does not request a special tone.
