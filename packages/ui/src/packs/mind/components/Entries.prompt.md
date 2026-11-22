## Purpose

Revisit personal journal entries grouped by month, newest first.

## Pick

A feed of past personal journal entries with dates, mood faces, excerpts, tags and optional thumbnails. Not general tappable rows (List), posts by other people (Feed), or saved passages from books (Highlights).

## Writer

- Hiding tags is a detail choice only: write `"detail":"brief","media":null` when asked to hide tags but not thumbnails. Keep any supplied tags; use an empty tags array if none are known.
- Set `"media":"none"` only if explicitly asked for a text-only digest or to hide thumbnails. No photo supplied does not mean text-only: write `"media":null` unless thumbnail visibility was requested. Keep any supplied photo references.
- Use real dates in YYYY-MM-DD, newest first. Each entry needs a goto screen id. Supply prompt only when a shared journal prompt badge is requested.
