## Purpose

Follow one request through staff updates, work events and replies.

## Pick

One service ticket's replies interleaved with typed status, assignment and work-order events, with staff-only or requester-visible audiences. Not an ordinary chat (Bubbles), read-only history (Timeline), general audit (ActivityLog), or post replies (Comments).

## Writer

- Each entry has by, date, time and audience. Set only fields for its kind: message = text and optional photo or opaque file reference; status = from/to; assignment = who; work = order/goto. Other fields must be null.
- Set cannedGoto only when given a screen id for opening saved reply templates. A message's file is the supplied opaque FileList reference, not a filename, URL, or path.
- For shorter event details but the same reply text, use detail "brief". The host filters internal entries for requesters and authors new operational events.
