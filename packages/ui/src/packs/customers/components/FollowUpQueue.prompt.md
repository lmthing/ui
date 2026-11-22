## Purpose

Prioritize client outreach by due date and act on each follow-up.

## Pick

A prioritized queue of client follow-ups across quotes, invoices, renewals and check-ins. Not plain jobs to tick off (Checklist), a client header (ClientCard), or repair tickets (RequestQueue).

## Writer

- Each entry needs a short unique id, clientName, kind, due date and done flag. Use done:false unless it is completed. Do not write urgency, groups per row or sort positions.
- Use group "none" for an unsectioned queue when asked. Leave group null for the default due-date sections. Set density "compact" only for tighter spacing, not for removing sections. Otherwise leave density and surface null.
- If the only appearance request is one list without sections, the exact axis values are {"density":null,"surface":null,"group":"none"}. Do not write surface:"card" for the default.
