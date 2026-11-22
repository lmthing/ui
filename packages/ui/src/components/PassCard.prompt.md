## Purpose

Keep a membership, coupon, or transit pass ready to show and scan.

## Pick

A digital membership card, coupon, insurance ID or transit fare pass with a code to show or scan. Not ordinary details of one record without a pass (KeyValue), an event admission ticket (Ticket or EventPass), a travel itinerary (Reservation), or a full tier and reward wallet (RewardsWallet).

## Writer

- Use style "coupon" for a voucher with an expiry, "code" for a centered QR-only presentation, or "transit" for a fare pass; otherwise use style null for a membership card. If a code is supplied, copy the exact value and use codeKind "qr". Never invent issuer credentials, member IDs, balances, or codes.
- Use detail "brief" only if asked to hide the summary facts; keep the supplied facts in the data. Use null for unrequested axes and [] when there are no summary facts.
