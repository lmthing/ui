## Purpose

Several things of the same kind, each one tappable.

## Pick

Show all the person's entries of one kind so they can scan and tap them, even if they will open only one. Not one featured thing (Card), pictures to browse (Gallery), details of one record (KeyValue), or jobs to tick off (Checklist).

## Writer

- Use null for all unrequested List and row axes. Data such as status, urgency or recency does not request a mark or tone. If asked to highlight, use mark "highlight" on at most one in three rows (none in a one- or two-row list).
- Use style "expand" with a body on every FAQ row or "shelf" with a photo on every sideways rail row. Photos use references like "lib:plants" or "local:1". The water icon is "drop".
- Rankings use style null (never expand), lead "number", trail "value", and each score in value. Only the person’s row gets me.
- For grouped headings use group "sections" and a section label on every row; keep rows in section order.
- For See all: overflow "peek"; style and all other axes null unless requested. Output every row, including hidden ones. If asked for names only, write title and leave all other row fields null.
- For a photo shelf with a tall crop or portrait covers, output "style":"shelf" and top-level "aspect":"tall". Leave density, surface, detail, arrange, group, overflow, lead, and trail null unless individually requested; never fill in defaults. Use arrange "grid" for two-column quick cards with style null. Progress is a fraction (0 to 1) and badge is a short label. Only set unread or pinned on rows explicitly described that way.
