## Purpose

Review staff requests and decide whether to approve or decline them.

## Pick

A manager decides on staff requests or reviews one proposal or estimate with evidence, line items and a decision. Also for a requester tracking their own submissions. Not chores (Checklist) or billing, invoicing and payment (Invoice).

## Writer

- A manager queue, including a queue that currently has only one request, uses style "queue" or null and review null. Use style "my_requests" only for tracking one's own submissions, also with review null. Use kind "shift_claim" for a request to take an open shift, not a swap of an assigned shift. Write supplied decisions as status ("pending", "approved", "declined").
- Write amounts as numbers without a currency. Use lead "none" only when asked to hide requester portraits; keep the photo references.
- Set unrequested axes to null: for requests without portraits use {"lead":"none"}.
- For one estimate or proposal with evidence and line items, set style to "review", not "queue". Whenever review is a non-null object, style must be "review" and requests must contain exactly one item. The review contains reference, evidence, lines (label and amount), and total. An undecided request has review.reason null; never use the evidence as a decline reason. A new decline requires a reason typed at review time.
