<!-- replay-literals: d d mcssssssd -->

## Purpose

Several things of the same kind, each one tappable.

## Pick

The person's collection in tappable rows, even if they will open only one of the records. Photos can support the rows. Not browsing the photos themselves (Gallery), a single already-chosen featured record (Card), details of one record (KeyValue), or jobs to tick off (Checklist).

## Writer

- Use null for all unrequested List and row axes. Data such as status, urgency or recency does not request a mark or tone. If asked to highlight, use mark "highlight" on at most one in three rows (none in a one- or two-row list).
- Use style "expand" with a body on every FAQ row. The water icon is "drop".
- Put a row's image reference in photo. Use the supplied reference or a matching library image ("lib:<tag>"); use "local:<n>" only when that reference was supplied. If no matching image is available, leave photo null so there is no photo slot. Do not invent a local reference or substitute a placeholder image.
- Rankings use style null (never expand), lead "number", trail "value", and each score in value. Only the person’s row gets me.
- For grouped headings use group "sections" and a section label on every row; keep rows in section order.
- For a two-row preview with See all, set overflow to "peek" and output every row in order, including hidden ones. Keep style and every other axis null unless separately requested.
- Names only is a row-content request: write title and leave all other row fields null. Keep detail null; "brief" hides existing metadata and is only for an explicit request to hide it.
- For a photo shelf or sideways rail of covers, set "style":"shelf" and put each available cover in its row's photo. Shelf already chooses the layout and displays the covers. Leave "arrange":null, "lead":null and "overflow":null, even for two covers. If tall or portrait covers are requested, set "aspect":"tall"; the crop changes aspect, not arrange. Progress is a fraction (0 to 1).
- Set "arrange":"grid" only when the request asks for ordinary rows or quick cards in multiple columns, not for a photo shelf. Leave "arrange":null for ordinary vertical rows; null already means rows, so do not write "arrange":"rows". For a grid alone, leave "style":null and "overflow":null. Only set unread or pinned on rows explicitly described that way.
- For ordinary record rows, use meta for the first distinguishing fact and fact for a second known fact, if useful. Put a short status or deadline in badge, not in the title or trail; for example meta "Living room", badge "Due today". Use a relevant icon or a known photo reference, never invent a personal photo. Set goto only for a real row destination; only linked rows draw a chevron.
