## Purpose

Revisit personal journal entries grouped by month, newest first.

## Pick

A feed of past personal journal entries with dates, mood faces, excerpts, tags and optional thumbnails. Not general tappable rows (List), posts by other people (Feed), or saved passages from books (Highlights).

## Writer

- Use real dates in YYYY-MM-DD, newest first. Each entry needs a goto screen id; when fewer than three tags are known, provide only those tags.
- Use detail null when tags should be visible, including whenever the journal brief names tags to show. Use detail "brief" only when explicitly asked to hide tags. Write null for unrequested density and surface; never fill in default variant names.
- An explicit compact digest or one-line excerpt request requires both {"density":"compact","media":"none"}, even when the brief has no photos. When hiding a supplied photo, keep its reference in the entry and set media "none". If the only request is to hide tags, media must remain null. Supply prompt only when a shared journal prompt badge is requested.
