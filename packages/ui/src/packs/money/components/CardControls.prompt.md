## Purpose

Freeze a payment card and control where and how much it can spend.

## Pick

Freeze one payment card or control its spending channels and cap. Not ordinary app settings (List), account balances (AccountCard), or paying bills (Bills).

## Writer

- To show only the freeze and channel controls, explicitly write `"detail":"brief"` at the top level. This hides the spend slider and reveal control without removing supplied card data.
- Use a demo card reference and four trailing digits only. Never invent or ask for a card number or CVV. A spend cap needs a positive maxCap at least as large as spendCap.
