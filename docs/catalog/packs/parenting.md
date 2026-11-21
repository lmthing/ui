# `parenting` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Pregnancy, pediatric growth, co-parenting and child
wellbeing: gestational weeks, contractions, kick counts, percentile charts, custody calendars, child
expenses, screen limits and family albums. Not household chores (`home`), not child-facing UX (`kids`).

## Purpose

Supporting expectant and active parents across pregnancy tracking, pediatric growth monitoring, structured
co-parenting coordination, child digital wellbeing limits, and private family photo sharing. Pregnancy and
growth tools compute gestational dates and WHO/CDC percentiles locally with clear informational disclaimers
(never replacing clinical care); co-parenting components keep custody schedules, swap approvals, and child
expenses auditable; and relative-only albums isolate child photos from public feeds.

## Apps it serves

Pregnancy and fetal tracking apps (BabyCenter, What to Expect), pediatric development & growth curve apps
(Huckleberry), co-parenting custody and expense organizers (AppClose, OurFamilyWizard), parental screen-time
and digital safety panels (Microsoft Family Safety, Kids360), and private family milestone albums
(FamilyAlbum).

## What the core already covers

- Newborn feeding, nappy/diaper, and sleep timers/logs: `home` (`BabyLog`); family chore rotations and
  household calendars: `home` (`Chores`, `Agenda`, `Rewards`).
- A simple due-date countdown alone: `Timer[until]`; hospital bag checklists: `Checklist`; co-parent text
  conversations: `Bubbles` + `Composer[reply]`; shared family roster: `People`.
- Immunization records, allergies, and clinic lab results: `medical` (`CareSummary`, `LabPanel`).
- Child-facing phonics, story pages, and parent gates: `kids` (when loaded); live family GPS circles and SOS
  beacons: `safety` (when loaded).

`PregnancyWeek` computes gestational weeks, trimesters, and fetal milestones rather than menstrual cycles
(`health` `Cycle`) or a plain countdown (`Timer[until]`). `ContractionTimer` derives start-to-start
contraction frequency, 1-hour averages, and 5-1-1 hospital alerts; `KickCounter` runs timed 10-kick
sessions; `GrowthChart` plots weight, height, and head circumference over WHO/CDC percentile bands rather
than adult goals (`health` `Measurements`). `CustodyCalendar` and `ExpenseClaim` add parent-coded rotations,
swap approvals, and child expense splits beyond `home` `Agenda` or `money` `Split`. `ScreenLimits` controls
bedtime downtime and app quotas; `MemoryAlbum` groups relative-only photos by computed child age.

## Components (8)

### `PregnancyWeek` · planned · content · phone
Gestational progress overview computed from estimated due date or last menstrual period (LMP), displaying
current week and day (`24w 3d`), trimester indicator, progress meter, everyday size comparison, baby length
and weight ranges, days remaining until due date, and weekly developmental milestones. Users can step across
earlier or later weeks to preview upcoming milestones while keeping current computed week pinned.
- Pick: week-by-week pregnancy progress, fetal size comparisons, and developmental milestones. Not menstrual
  cycles (`health` `Cycle`), not generic date countdowns (`Timer[until]`).
- Writes: `basis` (`due_date`, `lmp`), `referenceDate` date, `weekSelected` int 1–42 optional, `sizeLabel`
  text(24), `lengthRange` text(16), `weightRange` text(16), `milestones` text(120) each 1–3; `style`. Current
  week+day, trimester (`1`, `2`, `3`), progress ratio, and days remaining are computed strictly by code from
  `referenceDate` and `basis`.
- Styles: `overview` (default, gestational progress bar, size comparison card, and milestones), `compact`
  (summary header card for pregnancy dashboards).
- Parts → actions: `week select` (inspect any week 1–42), `edit press` (opens due-date setup).
- States: filled, empty (enter due date or LMP to begin), loading.
- Real path: computes gestational age locally from the stored due date or LMP; bundled milestones are
  educational copy and never replace prenatal medical guidance.

### `ContractionTimer` · planned · input · phone
Labor contraction stopwatch featuring a prominent Start/Stop toggle, live elapsed duration clock, recent
contraction log showing start time, duration, and interval from the start of the previous contraction, 1-hour
rolling averages (average duration and frequency), and a code-computed 5-1-1 alert banner when contractions
stay ≥ 1 minute long, ≤ 5 minutes apart, over a full hour.
- Pick: timing active labor contractions with computed start-to-start intervals, 1-hour averages, and 5-1-1
  alerts. Not general single timers (`Timer`), not newborn feeds/sleeps (`home` `BabyLog`).
- Writes: `activeStartedAt` ISO datetime with offset optional, `contractions` of `entryRef` text(32),
  `startedAt` ISO datetime with offset, `durationSec` int 1–1800, `intensity` (`mild`, `moderate`, `strong`)
  optional, 0–24 (up to 6 recent rows shown, full hour included in calculations); `ruleMinutes` int 3–10
  (default 5); `style`. Intervals between contraction starts, 1-hour averages, and the 5-1-1 hospital notice
  are computed strictly by code.
- Styles: `timer` (default, large Start/Stop clock, 1h rolling averages, 5-1-1 banner, and recent intervals),
  `log` (full recent contraction list with intensity tags).
- Parts → actions: `timer start`, `timer stop`, contractions `intensity select`, contractions `delete press`
  (`meta.confirmParts: ["delete"]`), `export press` (`meta.partTiers: { export: "service" }`).
- States: filled, empty (tap Start when a contraction begins), loading, success (5-1-1 threshold alert
  triggered).
- Real path: timestamps stored locally on the device; the 5-1-1 notice is an informational cue and never
  overrides midwife or hospital admission instructions.

### `KickCounter` · planned · input · phone
Fetal movement session counter with a large one-tap "Kick" button tracking progress toward a 10-movement
target, elapsed session timer, decrement/undo guard, and a dated session history showing time taken to reach
10 kicks. Reaching the goal completes and saves the session automatically with average duration computed.
- Pick: counting fetal movements in timed sessions toward a 10-kick target. Not generic counters
  (`Counter`), not strength sets (`health` `Workout`).
- Writes: `target` int 5–20 (default 10), `activeCount` int 0–30, `activeStartedAt` ISO datetime with offset
  optional, `sessions` of `sessionRef` text(32), `date`, `startedAt` HH:MM, `count` int 1–30, `minutes` int
  1–240, 0–6; `style`. Remaining kicks, elapsed clock, and average session duration are computed by code.
- Styles: `session` (default, ring progress toward 10 kicks, large Kick button, and recent sessions),
  `history` (dated past kick-count sessions with average completion time).
- Parts → actions: `kick increment`, `undo decrement`, `session start`, `session stop`, `reset press`
  (`meta.confirmParts: ["reset"]`).
- States: filled, empty (no movement sessions logged yet), loading, success (target count reached).
- Real path: movement timestamps saved locally on the device, paired with a reminder to contact a clinician
  if fetal movement patterns noticeably change.

### `GrowthChart` · planned · data · phone
Pediatric growth curve plotting child weight, height/length, or head circumference measurements over WHO
(0–24 months) or CDC (2–20 years) 3rd-to-97th percentile reference bands on `KitLinePlot`, displaying the
child's latest measurement, age at measurement, and code-computed percentile rank. Metric chips switch
between weight, height, and head circumference smoothly.
- Pick: plotting child weight, height, or head circumference over WHO/CDC pediatric percentile bands. Not
  adult weight targets (`health` `Measurements`), not clinical blood panels (`medical` `LabPanel`).
- Writes: `childName` text(24), `birthDate` date, `sex` (`female`, `male`), `standard` (`who`, `cdc`),
  `metric` (`weight`, `height`, `head`), `unit` (`kg`, `lb`, `cm`, `in`), `points` of `date`, `value` number
  > 0, 2–36; `addGoto` optional; `style`. Child age at each measurement, WHO/CDC reference percentile curves,
  latest percentile, and band position are computed locally by code.
- Styles: `chart` (default, shaded percentile bands with plotted growth curve and latest percentile card),
  `table` (dated measurement rows showing computed age and percentile).
- Parts → actions: `metric select` (weight, height, head), `standard select` (WHO vs CDC), `add press` (opens
  `addGoto`).
- States: filled, empty (add measurements to plot percentile curve), loading.
- Real path: evaluates child measurements locally against bundled WHO/CDC LMS reference tables on the
  device; charting does not replace pediatric well-child evaluations.

### `CustodyCalendar` · planned · input · people
Co-parenting custody rotation calendar (`2-2-3`, `2-2-5-5`, alternating weeks, or custom patterns) showing
parent-tinted day cells, exchange times and locations, holiday overrides, computed overnight counts per
parent for the month, and an inline swap-request card allowing the other parent to approve or decline a
schedule change with confirmation.
- Pick: managing co-parenting custody schedules, handoffs, holiday overrides, and schedule-swap approvals.
  Not shared family event lists (`home` `Agenda`), not simple marked dots (`Calendar`).
- Writes: `parents` of `name` text(20), `swatch` (`blue`, `green`, `purple`, `orange`), exactly 2; `pattern`
  (`2-2-3`, `2-2-5-5`, `alt_weeks`, `custom`), `anchorDate` date, `handoffTime` HH:MM, `handoffPlace`
  text(32) optional, `month` YYYY-MM, `overrides` of `date`, `toParent` (`0`, `1`), `reason` text(32)
  optional, 0–8; `swapRequest` of `requestRef` text(32), `fromDate` date, `toDate` date, `proposedParent`
  (`0`, `1`), `note` text(80) optional, `status` (`pending`, `approved`, `declined`) optional; `style`. Daily
  custody assignment, monthly overnight tallies, and override conflicts are computed by code.
- Styles: `month` (default, parent-coded month grid, overnight summary, handoff banner, and swap card),
  `upcoming` (next 14 days of handoffs and holiday overrides).
- Parts → actions: days `root select`, `request press`, `approve press`, `decline press`.
  `meta.partTiers: { request: "people", approve: "people", decline: "people" }`; `meta.confirmParts:
  ["approve", "decline"]`.
- States: filled, empty (configure custody rotation and anchor date), loading, success (swap resolved), error
  (sync conflict or invalid override dates).
- Real path: syncs custody schedules and timestamped swap decisions across co-parents in a shared app
  (`people`), retaining an immutable change log.
- Density: `meta.dense: true`, weight 3; a month-long parent rotation grid plus handoff/override rows exceeds
  six items.

### `ExpenseClaim` · planned · input · people
Co-parent child expense tracker recording shared costs (medical, school, childcare, clothing, activities)
with receipt photo thumbnail, configured split percentage (e.g. 50/50 or 60/40), code-computed net balance
owed between parents, and a `pending` → `approved` → `reimbursed` status workflow. Approving, declining, or
recording reimbursement requires confirmation and never moves bank funds automatically.
- Pick: tracking co-parent child expenses requiring receipt proof and approval workflow. Not casual friend
  IOUs (`money` `Split`), not small-business expenses (`books` `Expenses`).
- Writes: `parents` text(20) each exactly 2, `defaultSplitPct` int 0–100, `claims` of `claimRef` text(32),
  `date`, `title` text(32), `category` (`medical`, `school`, `childcare`, `clothing`, `activities`,
  `other`), `total` number > 0, `splitPct` int 0–100 optional, `paidBy` (`0`, `1`), `receipt` photo optional,
  `status` (`pending`, `approved`, `declined`, `reimbursed`), `goto` optional, 1–6; `style`. Parent shares,
  net owed balance, and formatted currency strings (`moneyLine`) are computed by code.
- Styles: `register` (default, net balance header and claim rows), `pending` (claims awaiting approval or
  reimbursement).
- Parts → actions: claims `root press`, claims `approve press`, claims `decline press`, claims `reimburse
  press`, `add press`. `meta.partTiers: { approve: "people", decline: "people", reimburse: "people" }`;
  `meta.confirmParts: ["approve", "decline", "reimburse"]`.
- States: filled, empty, loading, success (claim approved or reimbursed), error (receipt upload or sync
  failed).
- Real path: shares expense claims and receipt images between co-parents (`people`); reimbursement actions
  log mutual settlement and never initiate bank transfers.

### `ScreenLimits` · planned · input · ok
Child digital wellbeing panel displaying today's total screen time against the daily quota bar, scheduled
bedtime downtime hours, per-app or category time caps and block switches, and one-tap "+15 min" grant or
confirmed Pause All override buttons. Policy changes sync through the OS parental supervision adapter (`ok`).
- Pick: managing a child's daily screen-time quota, bedtime downtime, and app blocks. Not work availability
  (`booking` `Availability`), not smart-home outlets (`home` `Devices`).
- Writes: `childName` text(24), `dailyLimitMin` int 0–720, `usedMin` int 0–1440, `paused` boolean,
  `downtimeStart` HH:MM, `downtimeEnd` HH:MM, `apps` of `appRef` text(32), `name` text(24), `category`
  (`games`, `video`, `social`, `education`, `other`), `usedMin` int 0–720, `limitMin` int 0–720 optional,
  `blocked` boolean, 1–6; `style`. Remaining daily quota, over-limit warnings, and active bedtime downtime
  status are computed by code.
- Styles: `controls` (default, quota meter, pause/grant buttons, bedtime window, and app switches), `usage`
  (app usage ranked by time spent today).
- Parts → actions: `pause toggle`, `grant press` (+15 min bonus), `limit increment`, `limit decrement` (15m
  steps), apps `blocked toggle`, `downtime press`. `meta.confirmParts: ["pause"]`.
- States: filled, empty (link child device to manage), loading (applying policy), success (limits updated),
  error (supervised device unreachable).
- Real path: applies screen-time and downtime policies through the platform parental-control permission
  adapter (`ok`, or `service` when managed remotely); without it, displays a labelled mock.

### `MemoryAlbum` · planned · content · people
Private child-filtered photo and video milestone stream grouped automatically by computed child age at
capture ("14 months · Oct 2026"), featuring milestone badges ("First steps"), a sibling filter strip, and
relative-only comments and heart reactions. Access stays restricted to invited family members, never public
social feeds.
- Pick: organizing private age-tagged child photos and milestones for invited relatives. Not public social
  feeds (`social` `Feed`), not general photo galleries (`Gallery`), not personal mood journals (`mind`
  `Entries`).
- Writes: `children` of `childRef` text(32), `name` text(20), `birthDate` date, 1–4; `childFilter` text(32)
  optional; `moments` of `momentRef` text(32), `childRef` text(32), `date`, `photo`, `isVideo` boolean
  (default false), `caption` text(120) optional, `milestone` text(28) optional, `reactions` int 0–999,
  `liked` boolean, `comments` of `author` text(20), `text` text(80), 0–2, `goto` optional, 1–12; `style`.
  Exact child age headings at capture `date` are computed strictly by code from `birthDate`.
- Styles: `timeline` (default, age-grouped milestone cards with relative comments), `grid` (dense monthly
  photo contact sheet grouped by child age).
- Parts → actions: `child select`, moments `root press`, moments `like toggle`, moments `comment press`,
  `add press` (`meta.partTiers: { add: "ok" }`, photo library/camera access).
- States: filled, empty (add first family milestone photo), loading, success (moment shared), error (upload
  failed).
- Real path: stores child media in an invite-only family album (`people`) with photo-library permission
  (`ok`) for uploads and automatic age-grouping from birth dates.
- Density: `meta.dense: true`, weight 3; age-grouped photo/video feeds of up to 12 moments exceed six rows.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `expecting` | Gestational weeks, kick counting, and labor contractions | `parenting_pregnancy`, `parenting_kicks`, `parenting_labor` | `parenting_pregnancy`: Header, PregnancyWeek, Checklist, Note · `parenting_kicks`: Header[back], KickCounter, Note · `parenting_labor`: Header[back], ContractionTimer, Note |
| `child_growth` | Pediatric growth curves and measurement logging | `parenting_growth`, `parenting_measure_add` | `parenting_growth`: Header, GrowthChart, Stats, Button · `parenting_measure_add`: Header[back], Field[date], Field[number], Field[number], Button |
| `coparent` | Custody rotations, child expenses, and co-parent chat | `parenting_custody`, `parenting_expenses`, `parenting_chat` | `parenting_custody`: Header, CustodyCalendar, Note · `parenting_expenses`: Header, ExpenseClaim, Note, Button · `parenting_chat`: Header, Bubbles, Composer[reply] |
| `child_wellbeing` | Screen-time limits, bedtime downtime, and family album | `parenting_limits`, `parenting_album`, `parenting_relatives` | `parenting_limits`: Header, ScreenLimits, Note · `parenting_album`: Header, MemoryAlbum, Note, Button · `parenting_relatives`: Header[back], People, Note, Button |

The first listed layout is each archetype's `defaultLayout`; all layout ids carry the `parenting_` prefix
and are unique across the catalog. Recipes use only Core plus `parenting`, keep at most one dense component
per layout, and never duplicate `home/BabyLog` or `medical` clinical records.

## Worked example: NestTogether (expectant & co-parenting family)

Before delivery, Mia checks `expecting/parenting_pregnancy` where `PregnancyWeek` calculates `36w 2d · 3rd
Trimester · 26 days left` alongside her hospital-bag `Checklist`. In early labor she opens `parenting_labor`
and times contractions with `ContractionTimer`, watching 1-hour averages approach `5 min apart · 62s avg`
until the 5-1-1 hospital notice appears. Six months later, `child_growth/parenting_growth` plots Leo's
weight and length on `GrowthChart` (`WHO 68th percentile`), while `child_wellbeing/parenting_album` groups
first-smile photos by computed age ("6 months") for grandparents in `MemoryAlbum`. For older sibling Maya,
`coparent/parenting_custody` displays a `2-2-3` `CustodyCalendar` rotation with an approved Friday swap,
`parenting_expenses` reconciles a $180 dental bill split 50/50 (`ExpenseClaim`), and `parenting_limits`
grants "+15m" reading time via `ScreenLimits`. Signature: `ring_fill` on kick-count or daily screen quota.

## Tiers

`PregnancyWeek`, `ContractionTimer`, `KickCounter`, and `GrowthChart` run locally on the `phone`.
`ScreenLimits` device enforcement and `MemoryAlbum` photo uploads require OS parental/library permissions
(`ok`, `!needs-ok`). `CustodyCalendar`, `ExpenseClaim`, `MemoryAlbum` relative sharing, and Core `Bubbles` +
`Composer[reply]` require shared family/co-parent accounts (`people`, `!needs-people`). Exporting contraction
logs or remote screen-time syncing uses `service` parts (`!needs-service`).

## Build notes

- Order: `PregnancyWeek`, `KickCounter`, `ContractionTimer`, `GrowthChart`, `MemoryAlbum`, `ScreenLimits`,
  `CustodyCalendar`, `ExpenseClaim`.
- Strict `writerFormat(registry)` permits only Core plus selected packs. Host refs (`entryRef`, `sessionRef`,
  `requestRef`, `claimRef`, `appRef`, `childRef`, `momentRef`) are snake_case `text(32)`.
- `PregnancyWeek` derives gestational days from `dueDate - 280d` (or `lmp`) and local calendar date; reject
  dates yielding negative or > 44-week gestation.
- `GrowthChart` ships bundled WHO (0–24m) and CDC (2–20y) LMS reference tables so percentiles compute
  deterministically in code without network calls or model approximation.
- `CustodyCalendar` and `MemoryAlbum` carry `meta.dense: true` and weight 3; all other components weigh 2
  and respect the 6-row visible cap with shared "and N more" overflow copy.
- Compose views solely from existing kit bases (`KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitLinePlot`,
  `KitRing`, `KitMeter`, `KitDayMark`, `KitPhoto`, `KitTrack`, `KitChip`, `KitTime`, `KitText`, `KitTrail`,
  `KitAction`); no new kit base is required.

## Open questions

- **Newborn feeds, diapers, and sleep?** Default: keep in `home` (`BabyLog`); infant tracker apps combine
  `parenting, home`.
- **Live child GPS location & geofencing?** Default: handled by the proposed `safety` (`P2`) pack (`CircleMap`,
  `PlaceAlerts`), combined as `parenting, safety` when family tracking is needed.
- **Child-facing interactive UI?** Default: `parenting` is strictly parent-facing; child-facing phonics,
  story pages, and parental gates belong in the proposed `kids` (`P2`) pack.
