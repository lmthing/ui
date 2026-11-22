## Purpose

Bill a client or quote work before they accept it.

## Pick

A business's bill or quote to a client, with quantity-price lines, tax and sending. Not plain details (KeyValue), personal bills to pay (Bills), or a shop order (OrderSummary).

## Writer

- Write line quantities and unit prices plus optional tax percent; code computes subtotal, tax, total, balance and overdue.
- Hiding the note changes only detail: {"density":null,"surface":null,"detail":"brief"}. Keep the note in the data. Never emit "card" or "comfortable" just to indicate the default.
- Use style: "estimate" for a pre-work estimate. Only estimates can omit number; only an invoice can have status "paid".
- Discount and deposit are optional nonnegative money amounts, not percentages. Discount reduces the subtotal before tax; deposit is money already received. Use recurring for cadence and download: true only to offer document download.
