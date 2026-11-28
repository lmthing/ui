## Purpose

See timed events in order.

## Pick

Event schedules, hour blocks with gaps, or one record’s dated history. Not choosing dates (Calendar), browsing (List) or chores (Checklist).

## Writer

- Use day for a schedule of events with only single times, even if some are already done. Use history for an explicitly past-only log. Either takes up to six items. To show time and title only, set detail brief and keep supplied notes in meta.
- In day or history, keep a supplied event status (for example "Delayed by roadworks") in status, not meta. Leave status null if none is known; a completed event with done true already gets a completion label. If no updates are available, send items: [] rather than inventing events.
- Use hours for duration blocks on an hour rail: up to eight items, time as the start in HH:MM and a later end in HH:MM. Only hours uses end and goto; omit meta, status, and done in hours.
- Outside style "record", set record, reference, current, audience, and item summary to null. In hours, a screen id belongs only in that item's goto, never in current.
- Set detail and each event tone to null unless explicitly requested. Times, notes, completion and scheduling are data, not requests for a variant.
- For state changes of a single record, use style "record". Write its readable name in record, its present status in current, and its supplied identifier in reference. Put public text in each event's summary. Use audience "detail" only for an explicitly detailed view, and write its authorized additional notes in meta. Do not send private notes to a public view; omit meta entirely. This is not access control.
