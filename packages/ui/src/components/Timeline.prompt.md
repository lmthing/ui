## Purpose

Events in time order, or activities sized by duration on an hour rail.

## Pick

Dated or timed events in order. Use hours when start/end times, duration and free gaps matter. Not choosing dates (Calendar), things without times to browse (List), or independent jobs (Checklist).

## Writer

- Use day for a schedule of events with only single times, even if some are already done. Use history for an explicitly past-only log. Either takes up to six items. To show time and title only, set detail brief and keep supplied notes in meta.
- In day or history, keep a supplied event status (for example "Delayed by roadworks") in status, not meta. Leave status null if none is known; a completed event with done true already gets a completion label. If no updates are available, send items: [] rather than inventing events.
- Use hours for duration blocks on an hour rail: up to eight items, time as the start in HH:MM and a later end in HH:MM. Only hours uses end and goto; omit meta, status, and done in hours.
- Set detail and each event tone to null unless explicitly requested. Times, notes, completion and scheduling are data, not requests for a variant.
