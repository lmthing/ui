## Purpose

Reconcile monthly rent charges and receipts across units, including part payments and arrears.

## Pick

Reconcile rent charges and allocated or voided receipts by unit and period, or show a resident their own rent ledger. Not one sum (Amount), one client's payment (PaymentStatus), an invoice (Invoice), or personal bills (Bills).

## Writer

- Every receipt references a charge in this line; keep older charges when needed for arrears. Seed obligations and allocations only, not computed receipt totals, outstanding, arrears, credit or statuses.
- Give each charge and each receipt its own snake_case reference. Charges and receipts use positive numbers, not currency text. Use style "outstanding" only to filter unpaid units.
- If asked to shorten numbers, set figures to "short". Leave density null unless the person asks for tighter rows, even when figures is "short".
- Use style "tenant" only for a resident’s own rent ledger. Supply their tenantLetRef and only charges from that let and receipts allocated to them. Write autopay only when its on/off status is supplied.
