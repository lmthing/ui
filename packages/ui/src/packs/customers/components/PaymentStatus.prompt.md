## Purpose

Track whether one client payment arrived and mark it paid or remind them.

## Pick

One payment from a client, with paid amount, dates, method and mark or remind actions. Not a full bill (Invoice) or the person's own balance (Amount).

## Writer

- Write amount and optional paid amount, not a status or balance. Code derives paid, due, overdue or part paid from paid, amount and due.
- If asked only to hide the payment method, use {"detail":"brief"} and keep the method in the data. Otherwise detail is null.
- Use style "link" only with a supplied HTTPS paymentLink; never invent a link. For received installments, write their date and amount in installments. If paid is supplied, it is the full amount received and already includes these rows; otherwise code sums the rows.
