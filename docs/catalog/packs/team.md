# `team` pack

**Status:** revised · **Wave:** 5 · **Pick line:** Staff or volunteers: shifts, hours, handovers,
approvals. Not a sports squad (`sports`).

## Purpose

A small group that works together on a schedule: who is on when, who can cover a gap, hours worked, what the
last shift handed over, and requests waiting for a manager. It suits cafés, salons, clinics, volunteer
groups and family businesses.

## Apps it serves

Café or shop rota, salon staff schedule, volunteer shift sign-up, cleaning crew, small clinic on-call, event
staff (with `events`), student society duties, food bank volunteers.

## What the core already covers

- The team itself: `People` (rows, or `stack` for who is on now); one person: `Profile`.
- Jobs for a shift: `Checklist`; who is doing what: `List` with `meta` "Sam · by 3pm".
- Announcements: `Banner` or `Card`; the week's hours as a chart: `Bars`; a person's day: `Timeline`.
- Asking for time off: `Field`s, `Choice` and `Composer` on a form, sent as an `Approval`.

The first plan's `RoleBadge` is the `badge` on `Card` and the `List` trail `badge`, `Assignee` is `People`
style `stack`, and `TaskBoard` is data `Board`, so this pack holds only what is about shifts.

## Components (11)

### `Roster` · planned · data · people
The week as a grid: people down the side, days across, each cell a shift time or blank, today's column
tinted, and days short of cover flagged in `warn`.
- Pick: who works when across a week. Not one person's shifts (`Shift`), not bookable hours (booking
  `Availability`), not a sports lineup (sports `Lineup`), not a class timetable (learning `Timetable`).
- Writes: `week` date (Monday), `people` of `name` text(20), `photo`, 1–8; `shifts` of `person` index,
  `day` 0–6, `from` HH:MM, `to` HH:MM, `role` text(12) optional, `station` text(20) optional, 0–40;
  `date` optional (must lie in `week`), `style`.
- Styles: `week` (default, staff by weekday), `day` (shifts grouped by station for `date` or the current local day).
- Parts → actions: `week`, `matrix`, `cover`, `scroll_hint`, `empty`, `portrait_1` through `portrait_8`;
  shifts `root press`, `role`. Day view keeps original shift addresses and only offers shifts it shows. · States: filled, empty, loading.
- Real path: a shared rota in a shared app; one manager edits it. · Kit: `KitWeekMatrix`.

### `Shift` · planned · content · people
One shift as a card: day, times, place and role, who else is on, and swap or offer actions.
- Pick: one shift to see or change. Not the whole week (`Roster`), not a client's booking (booking
  `Appointment`).
- Writes: `date`, `from` HH:MM, `to` HH:MM, `place` text(28) optional, `role` text(16) optional, `with`
  text(48) optional, `status` (`confirmed`, `offered`, `swap_requested`).
- Parts → actions: `swap press`, `offer press`. · States: filled, loading.
- Real path: a shift record in a shared rota.

### `OpenShift` · planned · action · people
Shifts nobody has yet, each with time, role and pay, and a claim button; a claimed one becomes a `Shift`.
- Pick: gaps someone can pick up. Not shifts already assigned (`Shift`), not jobs to tick (`Checklist`).
- Writes: `shifts` of `date`, `from`, `to`, `role` text(16), `pay` number optional, 1–6.
- Parts → actions: items `claim press`. · States: filled, empty, success.
- Real path: open shifts in a shared rota; the manager approves claims.

### `TimeClock` · planned · input · phone
A large clock-in or clock-out button with the current shift, the time on shift so far, and today's breaks.
- Pick: starting and ending work time. Not timing an activity (`Timer`), not the week's hours (`Timesheet`).
- Writes: `on` boolean, `since` HH:MM optional, `shift` text(28) optional, `verification` (`geofence`, `pin`) optional,
  `breakTimer` boolean optional, `style`. Time on shift and breaks are computed from the stored clock events.
- Styles: `personal` (default), `kiosk` (worksite or PIN verification mark; the host performs verification).
- Parts → actions: `clock press`, `break press`, `verification`, `break_elapsed`, `break_elapsed_label`. Kiosk `clock` is `!needs-ok`.
  `break_elapsed` and `break_elapsed_label` appear only for an active break when `breakTimer` is true. · States: filled, success.
- Real path: timestamps stored on the device; sending them to a manager needs a shared app.

### `Timesheet` · planned · data · people
Hours worked per person for a week: hours per day, total, overtime in `warn`, and an approve action per row.
- Pick: totals of hours for pay. Not who works when (`Roster`), not a general table (data `Table`).
- Writes: `period` text(20), `rows` of `name` text(20), `hours` exactly 7 numbers, `approved` boolean,
  `punches` optional (0–28 entries of `day` 0–6, `from` HH:MM, `to` HH:MM optional), 1–8; `style`.
  Totals and overtime are computed from the daily hours. Punches are only for `mine`, which takes one row.
- Styles: `team` (default), `mine` (employee's own punches and totals with no manager actions).
- Parts → actions: `period`, `matrix`, `empty`, `submit press`, `submit_label`; rows `root`, `name`,
  `hours`, `total`, `overtime`, `approved`, `approve press`, `approve_label`, `punches`.
  Submit is offered only in `mine` for an unapproved row with one or more closed punches and no open ones. · States: filled, empty.
- Real path: clocked hours collected in a shared app.

### `Approval` · planned · action · people
Requests waiting for a decision: who asked, what (time off, a swap, an expense with its amount), the dates,
a note, and approve and decline.
- Pick: someone asked and a manager decides. Not a client accepting a quote (customers `Invoice` `quote`),
  not jobs to tick (`Checklist`).
- Writes: `requests` of `from` text(20), `photo`, `kind` (`time_off`, `swap`, `expense`, `other`, `shift_claim`),
  `title` text(32), `reference` text(24) optional (the same supplied request number in both roles),
  `dates` text(24) optional, `amount` number optional, `note` text(100) optional,
  `status` (`pending`, `approved`, `declined`) optional, 1–5; `style`.
- Styles: `queue` (default, manager decisions), `my_requests` (requester status with no decision controls; missing status displays as pending).
- `review` is a single-record decision review. It takes one request and `review`: `reference` text(24),
  `evidence` text(180), 1–6 priced `lines` of `label` text(48) and nonnegative `amount`, `total`, and optional settled `reason` text(120).
  The phone collects `reason type`; `accept press` or confirmed `reject press` goes to the host.
  A decline needs a nonblank reason. A host acknowledgement settles the review; rejection leaves it retryable.
- Parts → actions: `message`; requests `root`, `content`, `from`, `photo`, `kind`, `title`, `reference`, `dates`, `amount`,
  `note`, `approve press`, `approve_label`, `decline press` (in `confirmParts`), `decline_label`, `status`.
- States: filled (including awaiting decision and already decided), empty (no requests awaiting a decision in the queue, or no submissions in `my_requests`), success (read-only requests and their supplied decisions, no inferred outcome).
- Host acknowledgments: Publish `approvalDecisions` through device data, one current row per unique, non-recycled `reference`. A row takes `status`: `submitting`, `failed`, `approved` or `declined`. A missing or ambiguous reference leaves the row read-only. `submitting` disables both decisions on that request only; `failed` restores the manager's decisions; a terminal receipt removes actions in both views. Do not put these operation states in Writer props. The shared host owns admitting an attempt, serializing submissions and returning a current receipt; activity with no matching host snapshot is not evidence of an accepted decision.
- Motion: Enter on complete request rows, with no component reveal or signature. When the host changes the decision state, the badge uses the kit's local change cue (fade in reduced motion); the request facts stay in place. Submission keeps disabled footer slots and failure re-enables them without reflow. A settled row no longer needs decision controls and compacts. Press and decline confirmation use kit feedback. Cancel does not change the row, and changing the target record invalidates an open confirmation. Leave by the host's navigation, with no Approval-specific exit.
- Real path: requests in a shared app; the requester is told the answer.

### `Handover` · planned · content · people
Notes passed from one shift to the next, newest first: who wrote it, when, the note, and an optional flag
("low stock", "customer will call back"), each tickable as seen.
- Pick: what the next shift needs to know. Not a chat (`Bubbles`), not changes to records (data
  `ActivityLog`), not the person's own writing (`Composer`).
- Writes: `notes` of `by` text(20), `time` text(12), `text` text(160), `flag` text(16) optional, `seen`
  boolean, 1–6.
- Parts → actions: items `seen check`. · States: filled, empty.
- Real path: notes in a shared app.

### `LeaveBalance` · planned · data · people
Employee PTO summary broken down across leave types such as Vacation, Sick, and Personal time, showing accrued, used, pending, and code-computed available hours or days on progress meters. A request trigger opens the time-off request flow when linked.
- Pick: viewing accrued, used, pending, and available PTO balances by leave type. Not manager decisions (`Approval`), generic progress bars (`Progress`), or weekly shift hours (`Timesheet`).
- Writes: `employee` text(24) optional, `unit` (`hours` default, `days`), `balances` of `label` text(20), `accrued` number ≥ 0, `used` number ≥ 0, `pending` number ≥ 0, `cap` number > 0 optional, `expiresOn` date optional, `goto` optional, 1–6; `style`. Available balance (`accrued - used - pending`) and meter ratios are computed by code rather than written by the model.
- Styles: `meters` (default, each leave type with progress bar and accrued/used/pending/available breakdown), `compact` (single-row leave label and available balance).
- Parts → actions: balances `root press` (when linked via `goto`), `request press` (opens time-off request flow).
- States: filled, empty (no leave balances assigned), loading.
- Real path: accrued and pending PTO balances synced from a shared HR or workplace scheduling host.

### `PayStub` · planned · data · people
An employee's self-service read-only pay statement displaying pay period dates, pay date, itemized gross earnings, itemized tax and benefit deductions, code-computed net pay, and year-to-date totals. An export action downloads or shares a copy (`service`) without letting the employee modify payroll figures.
- Pick: an employee viewing their issued payslip and deductions. Not running employer small-business payroll (books `Payroll`), collecting daily hours (`Timesheet`), or personal bills (money `Bills`).
- Writes: `periodFrom` date, `periodTo` date, `payDate` date, `employee` text(24), `earnings` of `label` text(24), `hours` number ≥ 0 optional, `rate` number ≥ 0 optional, `amount` number ≥ 0, 1–6; `deductions` of `label` text(24), `amount` number ≥ 0, 0–6; `ytdGross` number ≥ 0 optional, `ytdNet` number ≥ 0 optional, `style`. Gross total, deduction total, and net pay (`gross - deductions`) are computed by code from the itemized lines.
- Styles: `statement` (default, net pay headline with full earnings, deductions, and YTD totals), `summary` (pay date, gross, deductions, and net pay only).
- Parts → actions: `export press`. `meta.partTiers: { export: "service" }`.
- States: filled, empty (no issued pay statements yet), loading, error (statement unavailable).
- Real path: finalized read-only pay statements issued to the employee by a shared employer payroll host.

### `TeamDirectory` · planned · content · people
A searchable staff and org directory grouped by department, showing each member's avatar, name, role, reporting manager link, and live availability badge (`on_shift`, `break`, `pto`, `off`), along with direct message and call buttons. Tapping a member row opens their profile or org record.
- Pick: browsing workplace staff, departments, reporting lines, and live shift status. Not small task teams (`People`), business clients (customers `ClientCard`), or club registers (community `Members`).
- Writes: `departments` text(24) each 0–6, `members` of `name` text(24), `role` text(24), `department` text(24) optional, `photo` optional, `availability` (`on_shift`, `break`, `pto`, `off`), `manager` text(24) optional, `goto` optional, 1–16; `query` text(32) optional, `style`. Department grouping and search matching are computed by code.
- Styles: `grouped` (default, department headings with role, availability badge, and message/call buttons), `compact` (flat alphabetical rows without contact shortcuts).
- Parts → actions: `search type`, members `root press`, members `message press`, members `call press`. `meta.partTiers: { call: "service" }`.
- States: filled, empty (no matching teammates), loading.
- Real path: staff directory and live shift status synced from a shared workplace app; calling opens the device dialer or VoIP service (`call`).
- Density: `meta.dense: true`, weight 3; workplace directories group up to sixteen staff rows across departments.

### `TeamNotice` · planned · content · people
A pinned workplace announcement or safety and policy bulletin displaying its title, author, timestamp, priority tone, and full body copy, paired with a required read-acknowledgment checkbox and live read count ("14 of 18 read"). Ticking acknowledgment records a read receipt for the current member.
- Pick: official workplace announcements or safety bulletins requiring read confirmation. Not shift-to-shift handovers (`Handover`), ephemeral status banners (`Banner`), or social posts (social `Post`).
- Writes: `title` text(48), `by` text(24), `postedAt` text(16), `priority` (`info` default, `important`, `urgent`), `body` text(400), `requireAck` boolean (default true), `acknowledged` boolean (default false), `readCount` integer ≥ 0, `totalMembers` integer ≥ 1, `goto` optional, `style`. Unread count and acknowledgment progress are computed by code.
- Styles: `bulletin` (default, full notice card with acknowledgment tick and read count), `pinned` (compact alert strip linking to full bulletin).
- Parts → actions: `ack check`, `root press` (when `goto` is linked).
- States: filled, loading, success (acknowledged).
- Real path: pinned workplace bulletins and per-employee read receipts synchronized in a shared team app.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `team` | My shift today | `today` | Header, TimeClock, Shift, Handover, Checklist |
| `rota` | The week's shifts | `week`, `open` | `week`: Header, Segmented, Roster, People[stack] · `open`: Header, Banner, OpenShift |
| `approvals` | Requests and hours | `requests`, `hours`, `request` | `requests`: Header, Segmented, Approval · `hours`: Header, Timesheet, Bars · `request`: Header, Choice, Field[date], Field[date], Composer[entry], Button |

## Worked example: Grind

A café with six staff. The manager's `rota` shows the week with one gap on Saturday, posted as an
`OpenShift` that Lee claims. Baristas clock in on `team/today`, read the morning's `Handover` ("oat milk
low") and tick the opening `Checklist`. Lee asks for a day off (`request`); on Friday the manager approves
`Timesheet` rows. Signature: `check_burst` on the opening checklist.

## Tiers

Everything except `TimeClock` needs the team on a shared app. A first showcase is the manager's view with
sample staff.

## Build notes

- Order: `Shift`, `Roster`, `OpenShift`, `Approval`, `Handover`, `TimeClock`, `Timesheet`; Wave 6 additions follow in order: `LeaveBalance`, `PayStub`, `TeamDirectory`, `TeamNotice`.
- `Roster` reads one line per person with their week ("Sam: Mon 7–15, Wed 7–15"), not a cell per day.
- Wave 6 option upgrades on existing components: `Roster` adds `style: "day"` (today's shifts grouped by station); `TimeClock` adds `style: "kiosk"` (geofence/PIN mark, `!needs-ok`) and live break timer; `Approval` adds `kind: "shift_claim"` and `style: "my_requests"`; `Timesheet` adds `style: "mine"` (employee's own daily punches before submit).
- Wave 6 boundaries: employer payroll runs stay in `books`, hiring pipelines in `hiring`, gig courier shifts in `dispatch`, and channels/calls in `comms`.

## Open questions

- **Pay rates and wages?** Default: out of scope; `Timesheet` gives hours only.
