## Purpose

See how many prepaid sessions are left, redeem one or renew the bundle.

## Pick

Track a prepaid bundle of appointments: paid session credits left, their expiry, redeeming a visit and renewing. Not visit stamps (Loyalty), bars against targets (Progress), or an unpaid bill (Invoice).

## Writer

- Use packId for the stored bundle reference. Write used, not remaining; used cannot exceed total. Dates use YYYY-MM-DD.
- Use "detail":null for ordinary bundles. If full details with a meter or controls are requested, use "detail":"full". Only a read-only credits-left row uses "detail":"brief".
- Unless explicitly asked for an outline, write "surface":null (not "card"). Unless asked for tighter spacing, write "density":null (not "comfortable").
