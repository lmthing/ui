# `projects` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Work with deliverables: projects, tasks,
milestones, time spent. Not running day-to-day operations (`data`), not staff shifts (`team`).

## Purpose

Delivering a bounded piece of work: agree what is included, break it into assigned tasks, meet milestone
gates, see dependencies across dates, and record the time spent on each task. It serves one person managing
their own work first; collaborators and clients do not have to use the app.

## Apps it serves

Freelance designer's projects, home renovation, thesis research and writing plan, small agency's client
deliverables, a photographer's exhibition preparation, a community group's one-off website launch.

## What the core already covers

- Project name, summary and stored lifecycle state: `Card` with a badge; dates and owner: `KeyValue`.
- Completion against agreed deliverables: `Progress`; one main goal: `Progress[ring]`; a few totals: `Stats`.
- A short list of independent jobs, even with an assignee or due date in meta: `Checklist`.
- Dates in order without acceptance gates: `Timeline`; dates with marks: `Calendar`; a countdown: `Timer[until]`.
- Steps through a short screen flow: `Steps`, not milestones in work that may run in parallel.
- Timing one activity now: `Timer[up]`; hours by day or shares by project: `Bars`, including `share`.
- Project lists: `List`; editing a task: `Field`s and `Composer[entry]`; collaborators: `People`.

The proposed `Project` component is dropped: status, due date and progress are a core recipe, not a new
choice. `Tasks` is kept only for linked, assigned work with subtasks or blockers; a plain to-do list remains
`Checklist`. `Milestones` is kept only for dated deliverable gates, not a decorative `Timeline`.
Operational kanban stays data `Board`; pay approvals stay team `Timesheet` and `Approval`; terms signed
once stay customers `Agreement`. None is required by this pack.

## Components (7)

### `Tasks` · planned · input · phone
Assigned project tasks with due dates, priorities and a single level of subtasks, showing which work blocks
each task. Checking a task updates the project record; a blocked task cannot be completed.
- Pick: assigned deliverable work with subtasks or dependencies. Not independent jobs (`Checklist`), not
  cards moved through operational columns (data `Board`), not graded coursework (learning `Assignments`).
- Writes: `items` of `taskRef` text(32), `projectRef` text(32), `title` text(32), `assignee` text(24)
  optional, `due` date optional, `priority` (`normal` default, `low`, `high`), `state` (`todo`, `doing`,
  `done`), `parentRef` text(32) optional, `after` task refs text(32) each 0–3, `goto` optional, 1–6;
  `style`. Parent tasks omit `state`: code derives it from their children. Overdue and blockers are computed.
- Styles: `rows` (default), `grouped` (by project, with subtasks indented).
- Parts → actions: items `root press` (linked), items `done check` (unblocked leaf tasks only), items
  `assign select` (an available assignee; local assignment by the person).
- States: filled, empty, loading, success (all shown tasks done).
- Real path: tasks and dependency links saved on the device; assigning work on another person's device
  needs a shared app, not merely an assignee name.

### `Milestones` · planned · data · phone
Dated delivery gates, each listing the deliverables that must be accepted before it is reached. Reached
gates are ticked; an overdue gate names what is still missing rather than just showing a late date.
- Pick: dated gates whose completion depends on accepted deliverables. Not dates alone (`Timeline`), not
  place in a sequence of screens (`Steps`), not amounts against targets (`Progress`).
- Writes: `projectRef` text(32), `gates` of `title` text(32), `due` date, `requires` deliverable refs
  text(32) each 1–6, `goto` optional, 1–6; `style`. Code computes reached, overdue, missing deliverables
  and the reached date from acceptance records; the model never writes a gate status.
- Styles: `rail` (default), `cards` (each gate's acceptance requirements shown below its date).
- Parts → actions: items `root press` (linked, opens the gate's deliverables).
- States: filled, empty, loading, success (all gates reached).
- Real path: milestone requirements and deliverable acceptance records on the device.

### `Gantt` · planned · data · phone
Tasks as bars across a bounded date range, with a sticky task label, milestone diamonds and dependency
links. It scrolls sideways on a phone; pressing a bar opens the task instead of editing dates by dragging.
- Pick: overlapping task date ranges and finish-to-start dependencies in one project. Not one day's hour
  blocks (`Timeline[hours]`), not operational stages (data `Board`), not shifts by person (team `Roster`).
- Writes: `projectRef` text(32), `from` and `to` dates (an inclusive range of 7–90 days), `tasks` of
  `taskRef` text(32), `title` text(32), `start` and `end` dates, `after` task refs text(32) each 0–3,
  `goto` optional, 1–12; `gates` of `title` text(32), `due` date, `goto` optional, 0–6; `style`.
  Durations, positions and date conflicts are computed; a range never rewrites dates.
- Styles: `week` (default, day columns), `month` (week columns).
- Parts → actions: tasks `root press`, gates `root press` (linked), `range select` (`week` or `month`).
- States: filled, empty, loading. · Metadata: `meta.dense: true`, weight 3; date-range planning is its job.
- Real path: scheduled tasks and milestone dates on the device, with links checked for cycles.

### `TimeLog` · planned · input · phone
Time entries grouped by day, each tied to a project and optionally a task, with billable or non-billable
marks and computed day and week totals. Start and stop append one timed entry; a manual entry opens a form.
- Pick: time spent on deliverables, entry by entry. Not timing without saving a work record (`Timer`),
  not staff clock-in (team `TimeClock`), not hours submitted for payroll approval (team `Timesheet`).
- Writes: `week` date (Monday), `entries` of `projectRef` text(32), `taskRef` text(32) optional,
  `title` text(32), `start` and `end` ISO 8601 date-times with UTC offsets, `billable` boolean,
  `note` text(36) optional,
  `goto` optional, 0–14; `projectRef` text(32) and `taskRef` text(32) optional (current timer target,
  project required when task is given); `addGoto` optional; `day` date (`compact` only, within `week`); `style`.
  Duration, totals and running time come from timestamps; no written total or running flag.
- Styles: `days` (default), `compact` (one selected day's entries, at most 6, with the same timer).
- Parts → actions: `timer start`, `timer stop`, `add press` (to `addGoto`), `export press`, entries
  `root press` (linked), entries `remove press`. · Metadata: `meta.dense: true`, weight 3;
  `meta.confirmParts: ["remove"]`, `meta.partTiers: { export: "service" }`.
- States: filled, empty, loading, success (entry saved).
- Real path: timestamped work entries stored on the device; export shares a file through the phone's
  share sheet, never submits a payroll approval.

### `Scope` · planned · input · phone
One project's agreed deliverables with a testable acceptance condition for each, an accepted mark, and a
separate list of what is excluded. A revision identifies the current baseline; it is not a contract to sign.
- Pick: what a project must deliver and how each output is accepted. Not generic facts (`KeyValue`), not
  terms signed once (customers `Agreement`), not a manager's request queue (team `Approval`).
- Writes: `projectRef` text(32), `revision` int 1–99, `deliverables` of `deliverableRef` text(32),
  `title` text(32), `acceptance` text(100), `due` date optional, `acceptedAt` date optional, `goto`
  optional, 1–6; `excluded` text(60) each 0–6; `style`. Accepted count and overdue are computed.
- Styles: `deliverables` (default), `baseline` (includes the exclusions under a separate heading).
- Parts → actions: deliverables `root press` (linked), deliverables `accept check` (records or clears
  acceptance), deliverables `remove press`. · Metadata: `meta.confirmParts: ["accept", "remove"]`:
  confirmation also protects clearing acceptance; both use standard confirmation copy.
- States: filled, empty, loading, success (all deliverables accepted).
- Real path: a versioned baseline and local acceptance dates on the person's device; a client's own
  acceptance through a shared app is `people` (`meta.partTiers: { accept: "people" }` on that host variant).

### `ProjectStatus` · planned · content · phone
A periodic project health check-in card showing RAG status (`on_track`, `at_risk`, `blocked`), a short headline summary, bulleted key wins and blockers, and the next upcoming milestone date. Posting a check-in opens the status update form when linked while preserving the current health snapshot.
- Pick: reporting periodic project health, wins, and blockers over time. Not gated deliverable dates (`Milestones`), generic cards (`Card`), or shift handovers (team `Handover`).
- Writes: `projectRef` text(32), `status` (`on_track` default, `at_risk`, `blocked`), `headline` text(80), `author` text(24) optional, `updatedAt` date, `wins` text(80) each 0–3, `blockers` text(80) each 0–3, `nextMilestone` (`title` text(32), `due` date, `goto` optional) optional, `postGoto` optional, `style`. Status tone and days remaining to the next milestone are computed by code.
- Styles: `update` (default, RAG badge, summary, wins, blockers, and next milestone row), `compact` (status pill, headline, and date only).
- Parts → actions: `milestone press` (opens `nextMilestone.goto` when set), `update press` (opens check-in form via `postGoto`).
- States: filled, empty (no status update posted yet), loading.
- Real path: periodic health check-ins saved locally with the project; sharing updates with collaborators uses a shared app (`people`).

### `ProjectBrief` · planned · content · phone
A project charter card framing the project objective, owner, target delivery window, pinned summary sections, and key resource links such as specs, design files, or repositories. Tapping a link opens the referenced internal screen or external URL while keeping the project overview focused.
- Pick: framing a project's goal, owner, window, and key reference links. Not testable deliverable acceptance (`Scope`), flat facts (`KeyValue`), or long-form reading (media `Article`).
- Writes: `projectRef` text(32), `title` text(40), `objective` text(240), `owner` text(24) optional, `start` date optional, `target` date optional, `sections` of `heading` text(24), `body` text(160), 0–3; `links` of `label` text(28), `kind` (`screen`, `file`, `url`), `goto` text(120), 0–5; `editGoto` optional, `style`. Formatted date window is computed by code.
- Styles: `overview` (default, objective, owner/window facts, sections, and resource links), `summary` (objective, owner, and target date only).
- Parts → actions: links `root press` (internal `screen` or `file` links), links `open press` (external `url` links), `edit press` (opens `editGoto` when set). `meta.partTiers: { open: "service" }`.
- States: filled, empty (brief not written yet), loading.
- Real path: project charter and local links stored on the device; external URL links open via the device's browser (`service`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `project` | One project fully | `projects_overview`, `projects_scope` | `projects_overview`: Header[back], Card, KeyValue, Progress, Milestones, Button · `projects_scope`: Header[back], Scope[baseline], Note, Button |
| `my_tasks` | My assigned work | `projects_assigned`, `projects_task_edit` | `projects_assigned`: Header, Chips, Tasks[grouped], Button · `projects_task_edit`: Header[back], Field, Field[date], Field[choice], Composer[entry], Button |
| `plan` | Delivery gates and dates | `projects_gates`, `projects_ranges` | `projects_gates`: Header, Milestones[cards], Note, Button · `projects_ranges`: Header, Gantt, Note, Button |
| `timesheet_week` | Time spent on projects, not payroll | `projects_time_week`, `projects_time_entry` | `projects_time_week`: Header, TimeLog, Bars, Note · `projects_time_entry`: Header, Field[date], Field[time], Field[time], Field[choice], Field[toggle], Composer[entry], Button |

The first listed layout is each archetype's `defaultLayout`. All layout ids are unique in the archetype
namespace. Recipes use only core plus `projects`; portfolio browsing uses core `list`, not a fifth archetype.

## Worked example: Folio

A freelance designer delivering a three-page website in two weeks. Ledge's recurring plant care and
Trot's recurring walks are not deliverable projects, so this example uses a different small app.
`project/projects_scope` lists a sitemap, three page designs and a handoff file, with acceptance conditions
and copywriting excluded. The first gate requires the sitemap accepted; `my_tasks/projects_assigned` shows
page design blocked by that task until it is done. `plan/projects_ranges` shows design and image preparation
overlapping, with handoff after both. `timesheet_week/projects_time_week` saves task-linked time entries,
separates billable time, and shows computed hours by weekday. Signature: `bars_grow` on those hours.

## Tiers

All five components' main use is `phone`: one person can assign tasks and record acceptance themselves.
Another person's live assignments or client acceptance needs `people`; `Scope.accept` declares that override
only in a shared host. `TimeLog.export` is `service`; no sending, notifications, payroll or payments are implied.

## Build notes

- Order: `Tasks`, `Scope`, `Milestones`, `TimeLog`, `Gantt`; Wave 6 additions follow in order: `ProjectStatus`, `ProjectBrief`. Every component has two domain examples,
  choose/write/read probes and a renderer from kit bases; the future `example.jsonl` validates and renders
  in three presets. This task plans those files; it does not build them or expose the pack to live prompts.
- Wave 6 option upgrades on existing components: `Tasks` adds `repeat` (`never | daily | weekly | monthly`), `tags` (0–2), and `style: "today"`; `TimeLog` adds `style: "summary"` (billable vs non-billable breakdown by project); `Milestones` adds `style: "compact"` (single-row next-gate strip); `Scope` adds `changeNote` text(120) per scope revision bump.
- Wave 6 boundaries: arbitrary Kanban and tables stay in `data`, collaborative wiki hierarchies/ACLs belong in `workspace`, staff payroll/leave belong in `team`, and client billing belongs in `customers`.
- Strict Writer output permits only core plus selected pack ids. Record refs are host-issued, text(32),
  distinct from validator-owned item ids; the brief supplies the allowed refs, narrowed in the scoped schema.
  Repeated seeds for one ref must agree; the host keeps one project/task/deliverable record behind every view.
- `Tasks` has at most 6 visible items total, including subtasks; other non-dense lists also cap at 6 and
  use shared copy for "and N more" from host counts. No model-written overflow count. `TimeLog[compact]`
  caps at 6 entries; only `TimeLog` and `Gantt` declare `meta.dense`. Other components weigh 2.
- Parents have one level, children and blockers belong to the same project, refs exist, and task dependencies
  are acyclic. Gantt task ends match Tasks due dates when given; links agree and gate dates match Milestones.
  Reopening a blocker is rejected while a completed task depends on it. Done tasks do not mean accepted
  deliverables. Progress comes from Scope acceptance, never an invented percentage.
- Date ranges satisfy start ≤ end; dependencies are finish-to-start only and never auto-reschedule work.
  Gantt clips bars to the chosen range without hiding their full dates in reads. Time entries end after start,
  fall within the selected local week, never overlap, and sum actual elapsed time across midnight or DST.
  The host supplies its time zone; at most one timer runs and only on an unblocked leaf task or a project.
- Timer state survives navigation and app suspension; repeated start/stop cannot duplicate an entry.
  Accepting records today's date; clearing or removing it recomputes gates and progress. Removing a referenced
  task or deliverable is rejected until its links are removed; editing the baseline increments the revision.
- Readers name blockers and missing deliverables, print full dates and computed durations, and expose only
  enabled actions. Gantt needs a kit date rail with accessible linked bars, not a chart library or raw styling.
- Exactly one signature per app; reuse core `bars_grow` or `check_burst`, do not propose a new signature.

## Open questions

- **New action names?** None. Export, remove and add use `press`; assignments use `select`; timers use
  existing `start` and `stop`; completion and acceptance use `check`.
- **Client sign-off and change requests?** Default: local acceptance and versioned Scope only; sharing
  acceptance uses the declared `people` part. Formal signatures, negotiation and approval queues are not built.
- **Rates and invoices?** Default: TimeLog records billable time, not prices; hours and totals are computed.
  If quoting or billing is needed, the Director may also select `customers`; no pack dependency or currency prop.
- **Long plans or resource levelling?** Default: a 90-day viewport, 12 scheduled tasks and 6 gates; navigation
  selects another range. Critical paths, automatic scheduling and staff capacity stay out until misses ask.
- **Build wave and kit date rail?** Default: wave to be decided after misses; mock Gantt first, then build
  the shared kit primitive before its renderer. Do not change the pack index or kit in this planning task.
