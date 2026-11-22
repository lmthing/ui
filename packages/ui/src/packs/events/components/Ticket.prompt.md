## Purpose

Show the holder's admission pass and code for one event.

## Pick

One issued event admission pass with holder, ticket type, venue and scannable ticket number. Not ordinary label/value facts (KeyValue), a travel confirmation (Reservation), a discount code (Promo) or the door scanner (Door).

## Writer

- For an ordinary admission pass use {"detail":null,"align":null,"density":null}. Only set detail to "brief" if the person explicitly says to omit the scan instruction. Never output "start" or "comfortable" just to set a default.
