<!-- replay-literals: d d mcdds -->

## Purpose

See endurance workout telemetry and compare individual splits.

## Pick

Endurance workout telemetry with distance, elapsed time, average pace and distance splits. Not standalone category bars (Bars), a stopwatch alone (Timer), strength sets and reps (Workout), or place stops (Route).

## Writer

- Use an ISO datetime with a UTC offset (Z is UTC). Use style live for controls, and set live true only if the clock is already running.
- Write each split's duration in seconds, not cumulative time. Average pace, speed and relative bars are calculated.
- When asked to hide elevation and zone, use detail brief. Keep the original telemetry values, and write null for unprovided optional telemetry.
