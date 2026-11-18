# `requests` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Requests moving through a service queue:
repairs, maintenance, support tickets, work orders. Not booking time (`booking`), not a simple repair
attached to something owned (`inventory`), not arbitrary records on a board (`data`).

## Purpose

An operator takes a reported problem through triage, assigned work, updates and verified resolution.
Reports can span visits, have several work orders, wait for parts or information, and reopen after a failed fix.

## Apps it serves

A landlord's maintenance desk, bike repair shop, school facilities, IT helpdesk, street fault reports, contractor.

## What the core already covers

- Reporting an issue: the core `form` recipe with `Field` for category, place and photo, `Choice` for
  urgency, `Composer[entry]` for the description, and `Button` to submit. A separate `ServiceRequest`
  form is dropped; capture now is `Camera`, existing evidence is `Photo` or `Gallery`.
- A short request list with status badges: `List`, with `Search` and `Chips`; one report's identity and
  facts: `Card` and `KeyValue`. A `RequestQueue` is only for operational grouping and deadline ordering.
- A plain history: `Timeline[history]`; an ordinary conversation: `Bubbles` with `Composer[reply]`.
  `RequestThread` is only for request-linked messages mixed with typed operational events and audiences.
- A promised date or countdown: `KeyValue` and `Timer[until]`. `Eta` is dropped; estimates are stored
  dates, not model guesses or a live technician map.
- Satisfaction after completion: `Scale[stars]`, `Composer[entry]` and `Button`. `Satisfaction` is
  dropped; a client review collection belongs to `customers`, not this pack.
- Simple jobs: `Checklist`; time spent now: `Timer[up]`; assignee identity: `People`; a cost: `Amount`.
  `WorkOrder` is only for linked execution records, required checks and consumed parts.

`inventory`'s existing `Request` remains its narrow rental-repair summary; this pack does not reuse its
id or require it. Load `requests` for triage, a cross-property queue, multiple work orders and reopening;
do not draw both workflows for the same report. Arbitrary stages and bulk record administration belong
to data `Board` and `Table`; appointments to `booking`, client records and invoices to `customers`,
borrowing and stock balances to `inventory`, recurring household care to `home`, staff leave to `team`.
These are optional combinations, never dependencies or off-pack recipe slots.

## Components (5)

### `RequestQueue` · planned · data · phone

Requests grouped by service status, with urgency, assignee, age and deadline marks.
The operator switches between active and completed work and opens a report, not arbitrary board columns.

- Pick: an operational request queue ordered by urgency and deadlines. Not a short badge list (`List`),
  not arbitrary stages (data `Board`), not rental repair intake (inventory `Request`).
- Writes: `rows` of `number` text(12), `title` text(32), `place` text(36) optional, `status` (`new`,
  `queued`, `working`, `waiting`, `resolved`, `closed`), `urgency` (`low`, `normal`, `urgent`), `who`
  text(24) optional, `opened` date, `openedAt` HH:MM, `due` date optional, `dueAt` HH:MM optional
  (requires `due`), `goto`, 1–6; `view` (`active` default, `completed`); `style`.
- Styles: `grouped` (default), `rows` (one ordered queue without headings).
- Parts → actions: rows `root press`, `view select` (`active` or `completed`), `retry press` in error.
  Counts, age, overdue, headings and order come from records and the clock; the host supplies overflow counts.
- States: filled, empty, loading, error (retry).
- Real path: an operator's request records on the device; other people seeing changes need a shared app.

### `RequestTriage` · planned · input · phone

One incoming report beside its scope, reported urgency, effective priority, queue and possible duplicates.
Applying triage queues the work or links it to an existing report without creating a second job.

- Pick: classify and route a reported problem, including duplicate handling. Not simply entering a
  category (`Field[choice]`), not manager permission for leave or expenses (team `Approval`).
- Writes: `number` text(12), `title` text(32), `reportedUrgency` (`low`, `normal`, `urgent`), `impact`
  (`one`, `several`, `site`), `priority` (`low`, `normal` default, `urgent`), `queues` of `label`
  text(20), 1–6, `at` queue index optional; `duplicates` of `number` text(12), `title` text(32),
  `goto`, 0–6; `duplicateAt` index optional; `reason` text(120) optional (required for a duplicate); `style`.
- Styles: `review` (default; report and decision), `compact` (decision only).
- Parts → actions: `priority select`, queues `root select`, duplicates `root press`, duplicates
  `link select`, `reason type`, `apply press`. `meta.confirmParts: ["apply"]`: linking a duplicate
  withdraws its independent work; every apply asks before committing.
- States: filled, loading, success (routed), error (invalid route or stale duplicate).
- Real path: a routing decision saved with the request on the operator's device.

### `RequestThread` · planned · content · people

A chronological stream of authored replies, photos and typed status, assignment and work-order events.
Staff choose an internal note or requester-visible reply; each message explicitly carries its audience.

- Pick: request-linked replies interleaved with operational events and audience controls. Not a plain
  conversation (`Bubbles`), not a read-only history (`Timeline[history]`), not a general audit (data
  `ActivityLog`), not replies under a post (social `Comments`).
- Writes: `number` text(12), `entries` of `by` text(24), `date`, `time` HH:MM, `audience` (`requester`,
  `internal`), `kind` (`message`, `status`, `assignment`, `work`), 0–6. Messages have `text` text(240)
  and optional `photo`; status events have `from` and `to` from `RequestQueue`'s status enum;
  assignment events have `who` text(24); work events have `order` text(12) and `goto`. Event kinds
  omit message-only props. `draft` text(240) optional; `audience` (`requester` default, `internal`); `style`.
- Styles: `updates` (default), `compact` (shorter event treatment, same full message text).
- Parts → actions: work entries `root press`, `field type`, `audience select`, `send send`.
  `meta.partTiers: { send: "people" }`; the host hides internal entries and the internal option from
  requesters before rendering or reading. Empty drafts cannot send; operational events are host-authored.
- States: filled, empty, loading, success (sent), error (send failed; draft retained).
- Real path: messages and operational events linked to one request in a shared app.

### `WorkOrder` · planned · input · phone

One execution record: assignee, planned window, required checks, work time and consumed parts.
A blocker names what is missing; finishing records work without closing the request or completing other orders.

- Pick: assigned work with required checks and material usage. Not simple jobs (`Checklist`),
  not attendance time (team `TimeClock`), not booked customer visits (booking `Appointment`).
- Writes: `number` text(12), `request` text(12), `title` text(32), `who` text(24) optional, `date` and
  `from`/`to` HH:MM optional (all three together; `to` later than `from`), `status` (`ready`, `working`,
  `blocked`, `done`), `blockedBy` (`information`, `access`, `parts`, `other`) and `note` text(120)
  required when blocked; `tasks` of `text` text(36), `required` boolean, `done` boolean, 1–6;
  `parts` of `name` text(32), `qty` number > 0, `unitCost` number ≥ 0 optional, 0–8; `minutes`
  number ≥ 0 (previously recorded work); `style`. Parts costs and total time are computed.
- Styles: `worksheet` (default), `summary` (read-only; requires `status: done`).
- Parts → actions: tasks `check check`, parts `qty set`, `clock start`, `clock stop`, `blocked select`
  (a blocker kind or `none` to clear), `note type`, `finish press`; all `worksheet` only.
  Finish requires all required checks done, no blocker and a stopped clock.
  `meta.dense: true`, weight 3: a work document of checks and up to eight material lines.
- States: filled, loading, success (done), error (incomplete checks or save failed).
- Real path: work records and clock events stored on the technician's device; no stock or payment moves.

### `RequestResolution` · planned · action · phone

A proposed resolution with outcome, evidence and verification checks, gated by required work.
The requester accepts or reopens with a reason, keeping the old resolution in history.

- Pick: resolve, verify or reopen a service request with linked work and evidence. Not a success message
  (`Success`), not a star rating (`Scale[stars]`), not accepting contract terms (customers `Agreement`).
- Writes: `number` text(12), `outcome` (`repaired` default, `workaround`, `unable`, `duplicate`),
  `summary` text(120), `duplicateOf` text(12) (duplicate only), `checks` of `text` text(36), `done`
  boolean, 1–6; `photos` of photo, 0–4; `reason` text(120) optional; `style`.
  Reason is required for unable/duplicate or reopening. Work completion and acceptance come from linked records,
  never independent Writer flags; duplicate targets must match the saved triage decision.
- Styles: `review` (default; proposed outcome), `receipt` (saved outcome and verification).
- Parts → actions: `outcome select`, checks `check check`, `resolve press`, `accept press`,
  `reason type`, `reopen press`. `meta.partTiers: { accept: "people", reopen: "people" }`;
  `meta.confirmParts: ["resolve"]` (an unable or duplicate outcome declines independent work).
  Only staff edit/resolve; accept requires a resolved request and all checks done; reopen requires a saved outcome.
- States: filled, loading, success (accepted), error (unfinished work, missing reason or save failed).
- Real path: a resolution saved on the operator's device; requester acceptance and reopening use a shared app.

## Archetypes (3)

| Archetype        | Job                                     | Layouts                                                                                              | Recipe                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report_issue`   | Describe and submit a problem           | `requests_intake`, `requests_evidence`, `requests_submitted`                                         | `requests_intake`: Header, Field[choice], Field, Choice, Composer[entry], Button · `requests_evidence`: Header[back], Field[photo], Note, Button · `requests_submitted`: Header, Success, Card, Button                                                                                                                       |
| `queue`          | Operator: triage and dispatch requests  | `requests_active`, `requests_triage`, `requests_dispatch`                                            | `requests_active`: Header, Search, Chips, RequestQueue, Button · `requests_triage`: Header[back], Card, RequestTriage, Note · `requests_dispatch`: Header[back], Field[choice], Field[date], Field[time], Field[time], WorkOrder, Button                                                                                     |
| `request_detail` | Follow work through verified resolution | `requests_overview`, `requests_updates`, `requests_work`, `requests_resolution`, `requests_feedback` | `requests_overview`: Header[back], Card, KeyValue, List, Button · `requests_updates`: Header[back], Card, RequestThread · `requests_work`: Header[back], KeyValue, WorkOrder, Note · `requests_resolution`: Header[back], RequestResolution, Note · `requests_feedback`: Header[back], Scale[stars], Composer[entry], Button |

The first listed layout is each archetype's `defaultLayout`. Dispatch's time fields bind to its order's
window; its `Button` saves assignment, not completion. Intake and evidence share one local draft, so
submit cannot discard the description. Overview's `List` opens work orders or updates, including zero
orders via its empty state. Recipes use only core plus `requests`; none requires another pack.

## Worked example: Spoke

A two-person bike repair shop. A customer reports a slipping chain on `report_issue/requests_intake`
and adds a photo on `requests_evidence`. The operator uses `queue/requests_active`, applies `RequestTriage`
to the drivetrain queue and assigns a `WorkOrder` with inspection, test-ride checks and a replacement chain.

The technician logs work time and a parts delay; `RequestThread` records the waiting status and public update,
keeping a staff diagnosis internal. `RequestResolution` lets the customer accept or reopen if the chain slips,
then rate the service on `requests_feedback`. Signature: `count_up` on core `Stats` in an optional core
`dashboard` of completed repairs; exactly one signature for the app, no new signature proposed.

## Tiers

Queue, triage, work records and proposing a resolution work on the operator's phone. `RequestThread` and
resolution `accept`/`reopen` need other people (`!needs-people`); shared intake submission uses a host-gated
core `Button` at that tier, while logging a walk-in locally stays `phone`. Photo capture or choosing an
image requires `ok` (`!needs-ok`); core `Field[photo]`'s permission/read mark is still pending.
Notifications need `ok`; email/SMS needs `service` (`!needs-service`), optional host features, not phone actions.
The first showcase uses labelled sample participants.

## Build notes

- Order: `RequestQueue`, `RequestTriage`, `WorkOrder`, `RequestThread`, `RequestResolution`; scaffold only.
  All use body region, weight 2 except dense `WorkOrder` at 3; recipes stay at 3–9 components and weight ≤12.
- Strict `writerFormat(registry)` accepts scoped ids and bounded props, no aliases or off-pack fallbacks.
  Each component needs two examples, choose/write/read probes and kit-only rendering for every state.
  The eventual `example.jsonl` validates and renders in three presets.
- Dates use `YYYY-MM-DD`, times `HH:MM`, one app-local zone; money is numeric in the brief's currency,
  formatted by `moneyLine`. The pack never writes totals, currency strings or charges.
- The host binds display numbers to stable request/work records, enforces roles and checks stale writes.
  Triage queues new work; work starts `working`, a blocker sets `waiting`, and all orders finishing only
  enables resolve. Resolve sets `resolved`, accept sets `closed`, reopen restores `new` for retriage.
  These transitions append typed events and update all projections together, never independent flags.
- Duplicate apply requires an existing non-self canonical request and prevents cycles; it preserves
  the report and history, stops separate work, and links its resolution to that canonical record.
  Required work gates repaired/workaround outcomes; unable/duplicate require a reason and confirmation.
- Filter audiences before rendering/reading, not by hiding supplied text. Thread reply uses kit bases
  inside `RequestThread`; core `Composer[reply]` is permitted only after `Bubbles` or social `Comments`.
- Queue rows stop at six across all groups; host overflow counts are code-owned. Non-dense lists cap at six.
  No new kit base: use existing rows, chips, checks, text, photo and input/action bases.

## Open questions

- **New action names?** None. Route, resolve, accept and reopen are part names using existing `select`
  or `press`; replies use existing `send`, work timing uses `start`/`stop`.
- **Inventory overlap?** Default: retain `Request` for rental-only summaries; select `requests` for operations.
  A future scoped review should decide whether to retire the overlap; no other pack changes here.
- **Response targets and ETA?** Default: operator-entered promised dates, with code computing overdue.
  Business-hour SLA policies and live technician location wait for misses and explicit host services.
- **Bookings, billing and stock?** Default: optional `booking`, `customers` or `inventory` combinations.
  Time/parts are records only; the host must explicitly connect a loaded pack for any booking, bill or stock change.
