## Purpose

See where your money went, entry by entry.

## Pick

Personal money in and out, grouped by day with payees and signed amounts. Not category totals (Bars), or a client's events (ClientHistory).

## Writer

- For rows without icons or thumbnails, explicitly write `"lead":"none"` at the top level. Keep each entry's source icon and any supplied receipt reference; leaving lead null shows the leading visuals.
- Amounts are signed: negative spending, positive income. Dates use YYYY-MM-DD. Never write totals or currency.
- Unrequested item tone and item mark must be null. Never infer tone from spending, a refund or income; the amount's sign has its own automatic treatment.
- Write a status (posted, pending or disputed), a short note, or a receipt photo reference only when supplied. A receipt thumbnail takes the icon's place when leading visual cues are shown; the source icon is still required.
