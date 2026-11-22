## Purpose

Measure time remaining or elapsed, with controls to start and stop.

## Pick

Time remaining until an activity ends or elapsed since it began. Not a number manually nudged up or down (Counter) or an amount completed toward a goal (Progress).

## Writer

- A shortened running time sets only figures "short"; keep exact seconds and write density as JSON null unless tighter spacing was requested. Do not output default axis values.
- A countdown to a calendar date uses style "until", a date in until, and null for seconds; down and up use seconds instead.
- A stopwatch with an elapsed-time target uses style "up" and goal in seconds. Keep elapsed seconds separate from the goal.
