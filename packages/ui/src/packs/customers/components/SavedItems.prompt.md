## Purpose

Reuse saved billable rates with their units and tax defaults while quoting or invoicing.

## Pick

A reusable rate card of saved billable line items with quick-add into an invoice or estimate. Not a bill for one client (Invoice), bookable services (ServiceMenu), retail stock (ProductGrid), or a simple list with values (List).

## Writer

- Use a unique short id for every saved item, a nonnegative numeric rate and an optional unit or category. Use taxable:false only for a nontaxable item. Don't put prices in titles or compute invoice totals.
- If asked for category headings, use exactly {"group":"sections"} for the axes. Keep category on each categorized item. Leave all axes null unless requested.
