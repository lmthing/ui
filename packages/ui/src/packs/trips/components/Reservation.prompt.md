## Purpose

Keep a travel confirmation, reference and gate pass together.

## Pick

One travel or lodging confirmation, with a copyable reference, optional seat and optional scannable pass. Not simple label/value facts (KeyValue), booking a provider (Appointment), running an event (Ticket), or buying goods (OrderSummary).

## Writer

- start and end are objects with date (YYYY-MM-DD) and time (HH:MM). Use null for an unknown end; do not guess arrival times. Use style "pass" and code true for a full-width scannable gate pass, otherwise omit style.
- A pass still shows the seat. Set detail to JSON null unless the person explicitly asks to hide the seat or room; only then set detail to "brief" and keep the assignment in seat. Set density and align to JSON null unless specifically asked for different spacing or alignment.
