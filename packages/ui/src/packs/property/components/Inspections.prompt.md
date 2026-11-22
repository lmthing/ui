<!-- replay-literals: d d mcdsds -->

## Purpose

Record and sign off dated room conditions and evidence for a unit.

## Pick

Dated room-by-room condition report with feature notes, photos, prior-report comparison and sign-off. Not jobs to tick (Checklist), photos alone (Gallery), or a repair to request (RequestQueue).

## Writer

- Use snake_case inspection, unit, room and check refs. Provide condition for each check; use unrecorded when unknown. Photos are media refs, never URLs.
- Use style "rooms" to record evidence and "report" for a read-only summary. Set finalisedAt only for a signed-off record with no unrecorded checks; previousRef is a different report.
- To hide the previous report reference, set detail to "brief" and retain previousRef and the evidence. For brief alone, use exactly {"detail":"brief"} for the variant fields. Null keeps the app settings; never fill unrequested defaults.
- Opt checks into tenant review with tenantSignoff "pending". Use "signed" only for an already co-signed check. Put supplied tenant dispute text in disputeComment, separate from the inspector’s note.
