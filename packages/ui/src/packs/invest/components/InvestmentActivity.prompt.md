## Purpose

Reconcile investment trades, contributions, withdrawals and fees with my holdings and cash.

## Pick

An investment ledger reconciling buys, sells, deposits, withdrawals, fees and linked dividend receipts. Not everyday spending (Transactions), client payments (ClientHistory), an audit (ActivityLog), or a dated event log (Timeline).

## Writer

- Use unique snake_case entry ids and ISO datetimes with offsets. Entries cannot predate since. Do not seed dividend receipts here: they come from Dividends.
- For buy or sell, write assetId, units, unitPrice and optional fee, never amount. For deposit, withdrawal or fee, write amount and leave all four trade fields null. Write positive amounts; kind determines direction.
- For event and cash movement only, write "detail":"brief","density":null and retain the trade seeds. Only an explicit spacing request sets density; never fill in "comfortable". Do not write computed balances or proceeds.
