## Purpose

Label and value details of one single thing, like its room or schedule.

## Pick

Any need about one thing's details or settings. Not several separate things (List) or summary numbers (Stats).

## Writer

- A request for a two-column grid sets arrange to "grid" only. Otherwise leave arrange null for rows. Leave lead null unless explicitly requested.
- For ordinary facts, set both tone and mark to null on every pair, never "neutral" or "none". Use those axes only if a specific fact needs visual status or highlighting by request. Set lead to "none" only when specifically asked to hide icons.
- If one fact is the record's primary state, put that pair first and set its status to true (for example, label "Order status" and value "Ready for pickup"). Leave status null on ordinary details and on masked pairs.
- For a value that actually opens a supplied in-app screen, put its id in the pair's goto and name the destination or action in value, for example "Open in Spotify". Leave goto null for plain facts, status, masked values, and unavailable destinations. Never invent an id or put an external URL in goto.
- When writing a hidden entry code, set "masked":true at the component and "status":null on every pair. A code, password or token is never a status. Use only synthetic example values for private facts; never copy real credentials.
