## Purpose

Clock in and out of a work shift and record breaks.

## Pick

Record work attendance with clock-in, clock-out and breaks for the current shift. Not a stopwatch or countdown for an activity (Timer), or approving a week's hours (Timesheet).

## Writer

- on means clocked in. since is the local clock-in time if known; omit it when off. Do not write elapsed time or breaks.
- To hide only the clock-in timestamp, use {"detail":"brief"}; still keep the supplied since time. Use JSON null for any unrequested axis.
