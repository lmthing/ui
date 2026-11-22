## Purpose

Find the next service request to work on by urgency and deadline.

## Pick

An operator's active and completed service tickets, grouped by lifecycle status and ordered by urgency and deadline. Not a short tappable badge list (List), arbitrary stages (Board), or one rental repair (Request).

## Writer

- Write 1–6 records across both views, only from the brief. An explicit request for one flat queue with no status headings requires group "none", not null. Only set density when spacing is requested.
- Never write display order, age, overdue or counts.
- Use date and HH:MM for opening; dueAt requires due. Omit both if there is no deadline.
- Use style "mine" only for the current operator’s assigned requests; the host identifies those rows. For a contractual SLA badge, write row.sla with the supplied ISO timestamps (with seconds and offset), including both targets. Never write a breach flag.
