<!-- replay-literals: d d mcdd -->

## Purpose

Save timed work entries and review billable and non-billable time by day.

## Pick

A saved work log of individual project or task time entries, billable marks, and totals. Not a single unsaved elapsed clock (Timer), staff clock-in (TimeClock), or payroll approval (Timesheet).

## Writer

- Week is a Monday. Use ISO date-times expressed in the log's local time with its UTC offset (Z only for UTC), with end after start and no overlap. Entries must fit the selected local week. Use projectRef on each entry and when setting a current taskRef. Do not write durations, totals or running states.
- For a week view, set style to "days" and day to null, even if there is only one entry. Use "single_day" only when the view is explicitly filtered to one day; supply its ISO date in day and at most six entries. To hide notes, set only detail to "brief" and retain notes in the data.
