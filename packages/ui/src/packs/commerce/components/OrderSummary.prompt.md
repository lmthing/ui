## Purpose

See what was ordered, what it cost and how it will arrive.

## Pick

A receipt for one placed goods order with quantities and fulfillment details. Not simple facts (KeyValue), the editable basket (Cart), fulfillment progress (OrderStatus), or a client bill (Invoice).

## Writer

- Write unit prices and quantities only; the total is computed. Use a real placed date in YYYY-MM-DD.
- Keep unit prices in the data. If asked to hide them with no change to the card or spacing, write exactly {"density":null,"surface":null,"detail":"brief"} for the three axes. In particular, surface must be null unless a container treatment is explicitly requested; do not fill in the default "card".
