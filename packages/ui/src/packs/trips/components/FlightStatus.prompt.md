<!-- replay-literals: d d mcd -->

## Purpose

Track one booked flight's live status, airport details and progress.

## Pick

Live operational status, gate updates and progress for one specific flight. Not static facts (KeyValue), a boarding pass (Reservation) or airport-wide boards (Departures).

## Writer

- Use local HH:MM for each airport; progress is a fraction, not a percent. Only write an estimate if known. For a single strip with status, gate and departure, set detail to "brief".
