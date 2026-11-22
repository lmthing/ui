## Purpose

See who changed a shared record, what changed, and when it happened.

## Pick

Audit changes by several people with actor portraits, times and links to changed records. Not scheduled events in time order (Timeline), one client's history (ClientHistory) or shift notes (Handover).

## Writer

- Write `"lead":null` for ordinary portrait rows, including when a portrait is supplied. Write `"lead":"none"` at the top level only if explicitly asked to hide portraits. Keep the photo references either way.
- Write the actor in who and the change in text, without repeating the actor in text. Keep the supplied timestamp and record link.
- Store each event category in entries[].kind. Set top-level kind to a category only to start with that filter selected; retain all entries. Write before and after text as diff: {"old":"Shade","new":"Sun"} only when both are supplied.
