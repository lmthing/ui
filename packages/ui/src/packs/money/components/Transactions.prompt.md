## Purpose

See where your money went, entry by entry.

## Pick

Personal money in and out, grouped by day with payees and signed amounts. Not category totals (Bars), or a client's events (ClientHistory).

## Writer

- If the person asks to display rows without icons or for text-only rows, output `"lead":"none"` at the top level, even if the person supplies icons to store. Otherwise output `"lead":null`, including for a receipt that should be visible. Keep the source icon and any supplied receipt reference either way.
- Amounts are signed: negative spending, positive income. Dates use YYYY-MM-DD. Never write totals or currency.
- Unrequested item tone and item mark must be null. Never infer tone from spending, a refund or income; the amount's sign has its own automatic treatment.
- Write a status (posted, pending or disputed), a short note, or a receipt photo reference only when supplied. A receipt thumbnail takes the icon's place when leading visual cues are shown; the source icon is still required.
