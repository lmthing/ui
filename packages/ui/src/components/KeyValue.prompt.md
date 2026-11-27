## Purpose

Label and value details of one single thing, like its room or schedule.

## Pick

Any need about one record's facts or settings. Not picking among named records (List), browsing photos (Gallery), or summary numbers (Stats).

## Writer

- A request for a two-column grid sets arrange to "grid" only. Otherwise leave arrange null for rows. Leave lead null unless explicitly requested.
- For ordinary facts, set both tone and mark to null on every pair, never "neutral" or "none". Use those axes only if a specific fact needs visual status or highlighting by request. Set lead to "none" only when specifically asked to hide icons.
- If one fact is the record's primary state, put that pair first and set its status to true (for example, label "Order status" and value "Ready for pickup"). Leave status null on ordinary details and on masked pairs.
- Keep a primary status to 20 characters. Put longer instructions in a separate ordinary label/value pair so they can wrap under their label. Masked values are limited to 28 characters.
- When writing a hidden entry code, set "masked":true at the component and "status":null on every pair. A code, password or token is never a status. Use only synthetic example values for private facts; never copy real credentials.
