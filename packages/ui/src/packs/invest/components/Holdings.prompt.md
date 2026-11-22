## Purpose

See the investments I own, their units, current value and unrealised gain.

## Pick

Owned investment positions with units, cost basis, dated quotes and unrealised gain. Not account balances (AccountCard), plain rows (List), things in storage (Things), or unowned investments (Watchlist).

## Writer

- Use short snake_case record ids and ISO datetimes with offsets. Write opening units and unit cost, not computed value or gain. Zero opening units register an instrument for later activity.
- To show just units and value, write "detail":"brief" and retain the seed data.
- A single-position filter uses an assetId from the portfolio.
