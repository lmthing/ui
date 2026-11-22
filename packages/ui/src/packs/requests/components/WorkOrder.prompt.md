<!-- replay-literals: d d mcddd -->

## Purpose

Carry out a repair with required checks, time and parts used.

## Pick

One assigned execution record tied to a service request, with required checks, time and consumed parts. Not simple jobs to tick (Checklist), attendance (TimeClock), or a booked visit (Appointment).

## Writer

- Provide date/from/to together with from before to. A blocked order needs blockedBy and note. Summary is read-only and requires done.
- Write previously recorded minutes and individual numeric quantities and unit costs only, not costs summed across parts or elapsed clock time.
- Use null for unrequested axes. Only when asked to hide the assignee and planned window, write {"detail":"brief"} unless those other axes are requested too. Always keep any supplied assignee and window in the data.
