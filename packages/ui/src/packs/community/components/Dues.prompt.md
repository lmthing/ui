## Purpose

Reconcile members' subscription assessments and receipts for one period.

## Pick

Collect and reconcile one period of membership dues against dated receipts. Not a single figure (Amount), personal bills (Bills), a client invoice (Invoice) or one client's payment status (PaymentStatus).

## Writer

- Use unique snake_case ids within assessments and receipts. Every receipt assessmentId must match an assessment id in this ledger. Write amounts as numbers, no currency or computed totals.
- Use style "ledger" for the treasurer. Use "member" only for a signed-in member and seed only that member’s assessments and receipts.
- Only set cadence for a stated schedule. Put waived and householdId on assessments, not on receipts. Keep the original assessment amount for a waiver.
