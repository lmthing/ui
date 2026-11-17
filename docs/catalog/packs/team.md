# `team` pack

**Status:** revised · **Wave:** 5 · **Pick line:** Staff or volunteers: shifts, tasks, approvals. Not a
sports squad (`sports`).

## Purpose

A small group that works together on a schedule: who is on when, who can cover a gap, hours worked, what the
last shift handed over, and requests waiting for a manager. It suits cafés, salons, clinics, volunteer
groups and family businesses.

## Apps it serves

Café or shop rota, salon staff schedule, volunteer shift sign-up, cleaning crew jobs, small clinic on-call,
event staff (with `events`), student society duties, nonprofit food bank.

## What the core already covers

- The team itself: `People` (rows, or `stack` for who is on now); one person: `Profile`.
- Tasks for a shift: `Checklist`; who is doing what: `List` with `meta` "Sam · by 3pm".
- Announcements: `Banner` or `Card`; the week's hours as a chart: `Bars`.
- A person's day: `Timeline`.

The first plan's `RoleBadge` is now the `badge` on `Card` and `List` trail `badge`, `Assignee` is `People`
style `stack`, and `TaskBoard` is left to `data` `Board`, so the team pack holds only what is about shifts.

## Components (7)

### `Roster` · planned · data · people
The week as a grid: people down the side, days across, each cell a shift time or blank, today's column
tinted and gaps flagged in `warn`.
- Pick: who works when across a week. Not one person's shifts (`Shift`), not working hours for bookings
  (booking `Availability`), not a sports lineup (sports `Lineup`).
- Writes: `week` date (Monday), `people` of `name` text(20), `photo`, 1–8; `shifts` of `person` index,
  `day` 0–6, `from` HH:MM, `to` HH:MM, `role` text(12) optional, 0–40.
- Parts → actions: cells `root press`. · States: filled, empty, loading.
- Real path: a shared rota in a shared app; one manager edits it. · Kit: `KitWeekMatrix`.
- Aliases: rota, schedule, roster, staff schedule.

### `Shift` · planned · content · people
One shift as a card: day, times, where and the role, who else is on, and actions to swap or offer it.
- Pick: one shift to see or change. Not the whole week (`Roster`), not a booked appointment (booking
  `Appointment`).
- Writes: `date`, `from`, `to`, `place` text(28) optional, `role` text(16) optional, `with` text(48)
  optional, `status` (`confirmed`, `offered`, `swap_requested`).
- Parts → actions: `swap press`, `offer press` (`!needs-people`). · States: filled, loading.
- Real path: a shift record in a shared rota. · Aliases: shift, my shift, next shift.

### `OpenShift` · planned · action · people
Shifts nobody has yet, each with time, role and pay, and a claim button; a claimed one turns into a
confirmed `Shift`.
- Pick: gaps that someone can pick up. Not shifts already assigned (`Shift`), not jobs to tick off
  (`Checklist`).
- Writes: `shifts` of `date`, `from`, `to`, `role` text(16), `pay` number optional, `currency`, 1–6.
- Parts → actions: items `claim press`. · States: filled, empty, success.
- Real path: open shifts in a shared rota; the manager approves claims. · Aliases: open shifts, cover, pick up, gaps.

### `TimeClock` · planned · input · phone
A large clock-in or clock-out button with the current shift, the time on shift so far, and today's breaks.
- Pick: starting and ending work time. Not timing an activity (`Timer`), not the week's hours (`Timesheet`).
- Writes: `on` boolean, `since` HH:MM optional, `shift` text(28) optional, `breaks` number optional.
- Parts → actions: `clock press`, `break press`. · States: filled, success.
- Real path: timestamps stored on the device; sending them to a manager needs a shared app.
- Aliases: clock in, clock out, time clock, punch.

### `Timesheet` · planned · data · people
Hours worked per person for a week or pay period: rows with hours per day, total hours, overtime in `warn`,
and an approve action per row.
- Pick: totals of hours for pay. Not who works when (`Roster`), not a general table (data `Table`).
- Writes: `period` text(20), `rows` of `name` text(20), `hours` 7 numbers, `approved` boolean, 1–8.
- Parts → actions: items `approve check`. · States: filled, empty.
- Real path: clocked hours from `TimeClock` collected in a shared app. · Aliases: timesheet, hours, payroll hours.

### `Approval` · planned · action · people
A request waiting for a decision: who asked, what (time off, a swap, an expense with its amount), the dates,
a note, and approve and decline.
- Pick: someone asked and a manager decides. Not a client accepting a quote (customers `Invoice` `quote`),
  not a list of tasks (`Checklist`).
- Writes: `requests` of `from` text(20), `photo`, `kind` (`time_off`, `swap`, `expense`, `other`), `title`
  text(32), `dates` text(24) optional, `amount` number optional, `note` text(100) optional, 1–5.
- Parts → actions: items `approve press`, items `decline press`. · States: filled, empty, success.
- Real path: requests in a shared app; the requester is told the answer. · Aliases: approvals, requests, time off, leave.

### `Handover` · planned · content · people
Notes passed from one shift to the next, newest first: who wrote it, when, the note, and flags such as
"low stock" or "customer will call back", each one tickable as seen.
- Pick: what the next shift needs to know. Not a chat (`Bubbles`), not a log of business changes (data
  `ActivityLog`).
- Writes: `notes` of `by` text(20), `time` text(12), `text` text(160), `flag` text(16) optional, `seen`
  boolean, 1–6.
- Parts → actions: items `seen check`. · States: filled, empty.
- Real path: notes in a shared app. · Aliases: handover, shift notes, logbook, notes.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `team` | Who is on today | `today` | Header, People[stack], Shift, Handover, Checklist |
| `rota` | The week's shifts | `week`, `open` | `week`: Header, Segmented, Roster · `open`: Header, OpenShift |
| `approvals` | Requests and hours | `requests`, `hours` | `requests`: Header, Approval · `hours`: Header, Timesheet, Bars |

## Worked example: Grind

A café with six staff. The manager's `rota` shows the week with one gap on Saturday, posted as an
`OpenShift` that Lee claims. Baristas clock in with `TimeClock`, read the morning's `Handover` ("oat milk
low"), and tick the opening `Checklist`. On Friday the manager approves `Timesheet` rows. Signature:
`check_burst` on the opening checklist.

## Aliases that shadow the core

With `team`: `rota`, `roster` → `Roster` (otherwise `Calendar`); `shift` → `Shift` (otherwise `Card`);
`requests`, `approvals` → `Approval` (otherwise `List`); `team` → `People` (unchanged: the core alias stays).

## Tiers

Everything except `TimeClock` needs the team on a shared app. A first showcase is the manager's view with
sample staff.

## Build notes

- Order: `Shift`, `Roster`, `OpenShift`, `Approval`, `Handover`, `TimeClock`, `Timesheet`.
- `Roster` reads one line per person with their week ("Sam: Mon 7–15, Wed 7–15"), not a cell per day.

## Open questions

- **Pay rates and wages?** Default: out of scope; `Timesheet` gives hours only.
