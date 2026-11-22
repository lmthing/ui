## Purpose

Keep track of event suppliers, bookings, payments and what is still owed.

## Pick

Suppliers for one event with roles, bookings, amounts agreed and paid, due dates and phone calls. Not a general directory (List), the business's own clients (ClientCard) or personal bills (Bills).

## Writer

- Use numeric cost and paid without currency; paid cannot exceed cost. Do not write totals.
- Set density and surface to null unless explicitly requested. Never write "comfortable" or "card" as defaults.
- To hide due dates only, use {"detail":"brief","density":null,"surface":null} and keep supplied dates in due. Otherwise leave detail null.
