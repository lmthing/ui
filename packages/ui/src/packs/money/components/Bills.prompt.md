## Purpose

Keep on top of upcoming bills and recurring subscriptions.

## Pick

Upcoming or recurring personal payments with amounts, due dates and paid ticks. Not generic tasks (Checklist), client invoicing (Invoice), past spending (Transactions), or debt forecasts (Loan).

## Writer

- Write stored paid flags and numeric amounts; never totals, overdue flags or currency. due is optional; repeat is never, weekly, monthly or yearly. Hide repeat labels with detail brief, keeping repeat in the data.
- For hidden repeat labels alone, set density, tone and mark to null. Never write comfortable, neutral or none as defaults. Recurrence and paid status alone do not request an item treatment.
- trialEnds is the free-trial end date (YYYY-MM-DD), separate from due. In subscriptions style, write manage: { "goto": "screen_id" } on a bill only when asked to link to its management or cancellation screen.
