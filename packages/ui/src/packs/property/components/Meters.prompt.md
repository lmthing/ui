<!-- replay-literals: d d mcdsd -->

## Purpose

Record cumulative utility readings and compare usage between readings for each meter.

## Pick

Cumulative utility meter readings and computed consumption between dated readings by meter. Not entering one number (Field), a short trend (Sparkline), body measurements (Measurements), or smart device controls (Devices).

## Writer

- Use snake_case refs. Each reading points to a meter in this line; no duplicate instants or decreasing values on the same meter. A replacement or reset requires a different meterRef.
- Write cumulative values (not differences or estimated bills), offset datetimes and an addGoto. Use "history" for interval readings, otherwise the meter register.
- Write null for all unrequested variant axes, not their defaults. For a register that hides the previous cumulative value, use detail "brief"; keep all readings.
