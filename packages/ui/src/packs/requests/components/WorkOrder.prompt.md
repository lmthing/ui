## Purpose

Carry out a repair with required checks, time and parts used.

## Pick

One assigned execution record tied to a service request, with required checks, time and consumed parts. Not simple jobs to tick (Checklist), attendance (TimeClock), or a booked visit (Appointment).

## Writer

- Use "worksheet" or null for active work, including status "working". Use "summary" only for an explicitly read-only, completed order with status "done".
- Provide date/from/to only when supplied, together with from before to. A blocked order needs blockedBy and note.
- Write previously recorded minutes and individual numeric quantities and unit costs only, not costs summed across parts or elapsed clock time.
- Give assetRef only for a supplied asset identifier. Leave signOff null unless this order requires sign-off; write false when still unsigned, or true only when already signed off.
- Use null for unrequested axes. Only when asked to hide the assignee and planned window, write {"detail":"brief","density":null,"surface":null} unless those other axes are requested too. Always keep any supplied assignee and window in the data.
