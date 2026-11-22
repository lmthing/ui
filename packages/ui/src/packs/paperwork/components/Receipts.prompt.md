## Purpose

Keep purchase evidence and review the share assigned to each receipt.

## Pick

Receipt evidence with private scans, amounts, review ticks and optionally allocated shares. Not one standalone amount (Amount), purchase warranties (Warranties), bank movements (Transactions), store orders (OrderSummary) or client bills (Invoice).

## Writer

- Write the amount as a number with no currency. allocation is the assigned percentage (0–100), not a deduction or an amount. Never write allocated amounts or totals.
- File is an opaque local:<id> or supplied synthetic lib:<id>, never a URL. Write style "cards" for separate receipt tiles only; otherwise style:null.
- Receipt rows shown directly on the screen without an enclosing card explicitly request surface:"plain". Write surface:null when no surface is requested, and density:null unless spacing changes are requested.
- Change detail to "brief" only for a request to hide the category and tags. For that request set surface:null and density:null unless separately requested. For a plain background alone leave detail:null.
