## Purpose

Review VAT boxes against source records and save a local snapshot.

## Pick

A local preview of prescribed VAT boxes: output tax, recoverable input tax, and payable or refundable VAT with evidence. Not a short set of arbitrary facts (KeyValue), money set aside (Progress), or taxable profit (ProfitLoss).

## Writer

- Write ordered dates spanning at most 366 days and a snake_case schemeRef. Box labels and amounts come from the rule and records, not Writer props.
- Use style "reconcile" only to trace box sources and exclusions; otherwise use "boxes". Saving is local, never filing or paying.
