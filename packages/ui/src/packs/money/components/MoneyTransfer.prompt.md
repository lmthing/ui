## Purpose

Send money to or request money from someone, with the cost shown before confirmation.

## Pick

Send or request money with a named recipient, funding account and speed, or show a personal payment QR. Not entering a local expense (AmountPad, Field), settling group costs (Split), or paying a business invoice (PaymentStatus).

## Writer

- Use style "qr" only for the personal code tab; copy only an explicitly supplied demo QR payload.
- To hide the memo, set detail "brief" and leave density and surface null. Never write surface "card" or a density unless explicitly requested.
- Write amounts as positive numbers to two decimal places, without a currency. Total and confirmation wording are computed.
