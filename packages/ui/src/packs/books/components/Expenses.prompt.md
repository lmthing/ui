## Purpose

Record business receipts and split their costs for bookkeeping and VAT.

## Pick

Receipt-backed business costs split into lines with a category, VAT code and business-use fraction. Not one ordinary form value (Field), a photo for a warranty (Warranties), staff approval (Approval), or the entire cash ledger (Ledger).

## Writer

- Use style "receipt" for exactly one receipt with editable draft lines; otherwise use "register". A receipt has one to eight splits; each has a positive net amount and businessUse from 0 to 1.
- Use snake_case references. A posted receipt has an offset datetime in postedAt; only a posted receipt can be voided. Never write gross, deductible cost or recoverable VAT.
- For a register with only the gross totals, use detail "brief". Keep all receipt data and write surface and density null unless requested.
