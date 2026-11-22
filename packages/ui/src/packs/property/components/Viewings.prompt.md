<!-- replay-literals: d d mcdd -->

## Purpose

Arrange property viewings and track each prospect’s confirmation and attendance.

## Pick

Property viewing appointments with a unit, prospect, confirmation, invitation or attendance outcome. Not a day's timed agenda (Timeline), free slots (Slots), or a booked service (Appointment).

## Writer

- Use snake_case viewing and unit refs, a start datetime carrying its timezone, duration in minutes and an edit screen goto. Future viewings cannot be attended or no_show; elapsed time alone is not attendance.
- To show all details including a note, set detail to "full".
