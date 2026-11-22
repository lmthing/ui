## Purpose

Review staff requests and decide whether to approve or decline them.

## Pick

A manager decides on staff requests such as time off, swaps or expenses, or a requester tracks their own submissions. Not chores to tick off (Checklist) or a client accepting a quote (Invoice).

## Writer

- Use style "my_requests" only for the requester tracking their own submissions, not manager decisions. Write each supplied decision as status ("pending", "approved", "declined"). Use kind "shift_claim" for a request to take an open shift, not a swap of an assigned shift.
- Write amounts as numbers without a currency. Use lead "none" only when asked to hide requester portraits; keep the photo references.
- Set unrequested axes to null: for requests without portraits use {"lead":"none"}.
