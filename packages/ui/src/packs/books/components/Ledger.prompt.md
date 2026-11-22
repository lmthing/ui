## Purpose

Review classified business cash movements and open the receipts or payments behind them.

## Pick

A business's dated cash book with amounts in and out, account and category references, linked source records or transfer pairs. Not a plain dated history (Timeline), personal spending (Transactions), one client's activity (ClientHistory), or arbitrary records (Table).

## Writer

- Write positive net amounts, direction and snake_case references. Do not write VAT amounts, gross, totals or running balances.
- A visible transfer pair uses the same transferRef, opposite directions, equal net, distinct accounts and no vatCode. A counterpart outside this seed may resolve from the host ledger.
- Periods are ordered and at most 366 days inclusive. For account headings write group sections. Use group null when not grouping.
