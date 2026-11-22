## Purpose

Reconcile business income, costs and taxable profit for a period.

## Pick

A business accounting statement of income and costs by category for a period, optionally reconciling bookkeeping profit to taxable profit. Not independent headlines (Stats), one number (Amount), a chart (LineChart), or VAT boxes (VatReturn).

## Writer

- Write dates and an optional ledger destination, never figures or categories. The host computes all amounts and reads the full ledger.
- Use both comparison dates or neither. Each period is ordered and at most 366 days inclusive. Use style "tax_bridge" for disallowed costs and taxable profit; otherwise use "statement".
- When asked to hide the individual category changes, use detail "brief" and keep both comparison dates. In a brief-detail statement write surface null and density null unless explicitly asked for an outline or compact spacing. Leave all unrequested axes null.
