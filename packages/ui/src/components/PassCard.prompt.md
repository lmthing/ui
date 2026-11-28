## Purpose

Keep a membership, coupon, or transit pass ready to show and scan.

## Pick

A digital membership card, coupon, insurance ID or transit fare pass with a code to show or scan. Not ordinary details of one record without a pass (KeyValue), an event admission ticket (Ticket or EventPass), a travel itinerary (Reservation), or a full tier and reward wallet (RewardsWallet).

## Writer

- Use style "coupon" for a voucher with an expiry, "code" for a centered scannable code, or "transit" for a fare pass; otherwise use style null for a membership card. Copy an explicitly supplied code exactly and use codeKind "barcode" for a requested 1D barcode (up to 10 printable ASCII characters or up to 20 digits in complete pairs), otherwise "qr". Never invent issuer credentials, member IDs, balances, or codes.
- Use bright true only when asked for a bright or enlarged scanner view for a supplied code. This adds a local toggle and does not turn on brightness by default; use null otherwise.
- Use detail "brief" only if asked to hide the summary facts; keep the supplied facts in the data. Use null for unrequested axes and [] when there are no summary facts.
- Use a `badge` slot in `photo` only as decorative art for the pass; never invent issuer branding, membership proof, letters, or a scannable code. In an image slot, use a short plain noun phrase from the app’s world for `subject`; no style, camera, palette or layout words.
