<!-- replay-literals: d d mcssssssd -->

## Purpose

Several things of the same kind, each one tappable.

## Pick

The person's separate records of one kind, in tappable rows to scan by name and open one. Photos can support the rows. Not browsing the photos themselves (Gallery), one featured thing (Card), details of one record (KeyValue), or jobs to tick off (Checklist).

## Writer

- Use null for all unrequested List and row axes. Data such as status, urgency or recency does not request a mark or tone. If asked to highlight, use mark "highlight" on at most one in three rows (none in a one- or two-row list).
- Use style "expand" with a body on every FAQ row or "shelf" with a photo on every sideways rail row. Photos use references like "lib:plants" or "local:1". The water icon is "drop".
- Rankings use style null (never expand), lead "number", trail "value", and each score in value. Only the person’s row gets me.
- For grouped headings use group "sections" and a section label on every row; keep rows in section order.
- For a two-row preview with See all, set overflow to "peek" and output every row in order, including hidden ones. Keep style and every other axis null unless separately requested.
- Names only is a row-content request: write title and leave all other row fields null. Keep detail null; "brief" hides existing metadata and is only for an explicit request to hide it.
- For a photo shelf with a tall crop or portrait covers, output "style":"shelf" and "aspect":"tall". Leave unrequested axes null. Progress is a fraction (0 to 1).
- For two-column quick cards, set only arrange to "grid": use "style":null and "overflow":null, never "overflow":"all" just because all rows fit. Only set unread or pinned on rows explicitly described that way.
- For ordinary record rows, use meta for the first distinguishing fact and fact for a second known fact, if useful. Put a short status or deadline in badge, not in the title or trail; for example meta "Living room", badge "Due today". Use a relevant icon or a known photo reference, never invent a personal photo. Set goto only for a real row destination; only linked rows draw a chevron.
