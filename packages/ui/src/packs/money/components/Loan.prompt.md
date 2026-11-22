## Purpose

Understand one debt's terms, remaining principal and projected repayment schedule.

## Pick

One debt's terms and calculated principal, interest and installment forecast, including interest-free borrowing and Pay-in-4. Not one amount owed (Amount), recorded repayment progress (Progress), a recent balance trend (Sparkline), reminders (Bills), belongings (Loans), or debt priority (Payoff).

## Writer

- Write opening principal > 0, nominal annual rate 0–100, payment per period > 0, firstDue YYYY-MM-DD, and at most six recorded payments with due and positive amount. No currency, balance, interest totals, schedule or finish date.
- Use detail full only when asked to list upcoming installments; otherwise leave detail null for a summary. For a schedule without a spacing request, density must be null, not comfortable.
- If asked for a Pay-in-4 or installments plan, use style "installments" and leave detail null. Set cadence to weekly, biweekly (every two weeks) or monthly when specified; null otherwise. Do not invent a payment cadence.
- For recorded payments, use the scheduled installment due date for the cadence, not the day the money was paid.
