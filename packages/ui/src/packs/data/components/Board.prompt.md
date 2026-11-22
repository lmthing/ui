## Purpose

See records by stage and move them between stages.

## Pick

Move cards between two to five named stage columns with counts and optional totals. Not ticking off jobs in one list (Checklist), working a service request queue (RequestQueue), or a week of shifts (Roster).

## Writer

- card.column is a zero-based index into columns. Use unique stage labels because the move action takes the destination label. Counts and totals are computed; never write them.
- Use arrange "rows" for stages stacked vertically, otherwise null.
