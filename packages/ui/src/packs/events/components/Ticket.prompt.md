## Purpose

Show the holder's admission pass and code for one event.

## Pick

One issued event admission pass with holder, ticket type, venue and scannable ticket number. Not ordinary label/value facts (KeyValue), a travel confirmation (Reservation), a discount code (Promo) or the door scanner (Door).

## Writer

- For an ordinary admission pass use {"detail":null}. Only set detail to "brief" if the person explicitly says to omit the scan instruction.
- Set style only for an explicitly requested badge or pass format. Include only the supplied section, row and seat. Set status only when supplied; used or transferred tickets no longer display an admission QR.
- Enable transfer (true) only if explicitly requested and the ticket is still eligible for admission.
