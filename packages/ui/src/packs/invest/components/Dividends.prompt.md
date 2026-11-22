## Purpose

See investment distributions and record which payments actually arrived.

## Pick

Investment distributions tied to entitled units, per-unit amounts, withholding and actual receipts. Not bills to pay (Bills), deposits (InvestmentActivity), or an ordinary dated event history (Timeline).

## Writer

- Use unique snake_case distribution ids, ISO datetimes with offsets for entitledAt/receivedAt, and YYYY-MM-DD for payOn. Omit receivedAt for unpaid entries. Never write entitled units, computed gross/net cash or status.
- Use style "received" for received entries only, newest first; otherwise leave style null.
- Set detail to "brief" for just the instrument, status, pay date and net cash. Density is independent: write "density":null unless the person explicitly asks for different spacing. Do not write "comfortable" as a default.
