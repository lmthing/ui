## Purpose

Read the facts of one record.

## Pick

Labelled facts for one record, not browsing (List, Gallery) or totals (Stats).

## Writer

- A request for a two-column grid sets arrange to "grid" only. Otherwise leave arrange null for rows. Leave lead null unless explicitly requested.
- For ordinary facts, set both tone and mark to null on every pair, never "neutral" or "none". Use those axes only if a specific fact needs visual status or highlighting by request. Set lead to "none" only when specifically asked to hide icons.
- If one fact is the record's primary state, put that pair first and set its status to true (for example, label "Order status" and value "Ready for pickup"). Leave status null on ordinary details and on masked pairs.
- Keep a primary status to 20 characters. Put longer instructions in a separate ordinary label/value pair so they can wrap under their label. Masked values are limited to 28 characters.
- For one hidden code, make the code the only pair: every value in this block is masked. Example: `{"c":"KeyValue","masked":true,"pairs":[{"label":"Entry code","value":"DEMO-042","status":null}]}`. Do not include a status, instructions or other public facts in a masked block. Use only synthetic example values for private facts; never copy real credentials.
