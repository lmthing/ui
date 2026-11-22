<!-- replay-literals: d d mcdsd -->

## Purpose

Compare rent and term choices for an occupied unit and respond to the renewal offer.

## Pick

An occupied unit’s lease renewal proposal: compare current and offered rent, choose a renewal term and accept, counter or decline by a deadline. Not a standalone choice (Choice), a policy expiry reminder (Renewals), a monthly rent ledger (RentRoll), or existing lease terms (Lease).

## Writer

- Use snake_case renewal and unit refs, a real YYYY-MM-DD deadline, and unformatted positive rents. Term months are whole numbers, with 0 for month-to-month. An option without rent uses proposedRent; do not write a delta.
- Set selectedOption to the zero-based position of the chosen option when specified. Use style "summary" for a read-only outcome after a response.
- Hide per-option term explanations with "detail":"brief". Leave detail null for the default explanations.
