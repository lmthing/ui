## Purpose

See who changed a shared record, what changed, and when it happened.

## Pick

Audit changes by several people with actor portraits, times and links to changed records. Not scheduled events in time order (Timeline), one client's history (ClientHistory) or shift notes (Handover).

## Writer

- Write the actor in who and the change in text, without repeating the actor in text. Keep the supplied timestamp and record link. Use lead "none" only when explicitly asked to hide portraits; still write photo for every entry.
- Store each event category in entries[].kind. Set top-level kind to a category only to start with that filter selected; retain all entries. Write before and after text as diff: {"old":"Shade","new":"Sun"} only when both are supplied.
