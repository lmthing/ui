## Purpose

Freeze a payment card and control where and how much it can spend.

## Pick

Freeze one payment card or control its spending channels and cap. Not ordinary app settings (List), account balances (AccountCard), or paying bills (Bills).

## Writer

- Write `"detail":null` for ordinary controls, including when configuring only certain channels or supplying a spend cap. Write `"detail":"brief"` only for an explicit request to hide the spend slider and reveal control while keeping the card data.
- Use a demo card reference and four trailing digits only. Never invent or ask for a card number or CVV. A spend cap needs a positive maxCap at least as large as spendCap.
