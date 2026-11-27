# `health` pack

**Status:** new · **Wave:** 2 · **Pick line:** The body: workouts, medication, measurements, symptoms,
cycles. Not the mind (`mind`), not food (`kitchen`).

## Purpose

The most-asked personal app family: logging workouts set by set, taking medication on time, watching a body
measurement move toward a goal, keeping several healthy habits, tracking symptoms, vitals and a menstrual
cycle. Everything stays on the phone; nothing here is medical advice, and "what's real?" says so.

## Apps it serves

Gym or home workout log, running or cycling plan (with `places` for routes), medication and supplement
reminder, weight or body measurement tracker, habit tracker for health habits, blood pressure or glucose
log, period and cycle tracker, physio exercise plan, step and activity goals.

## What the core already covers

- One goal for today (steps, water, minutes): `Ring`; a count (glasses of water): `Counter`.
- A habit kept day after day: `Streak`; today's health jobs: `Checklist`.
- Minutes by day: `Bars`; a few numbers: `Stats`; one latest value with a short trend: `Sparkline`.
- Timing a run or a rest: `Timer`; an exercise video: `Player` style `video`.
- How a day felt: `Scale` style `mood` (the `mind` pack goes deeper).
- Reminder times: `Field` kind `time` and kind `repeat`.

## Components (11)

### `Workout` · planned · input · phone
One session's exercises, each with its sets as rows of small boxes (set number, previous best, weight,
reps) and a tick per set; ticking a set starts a rest countdown under it; the session's time runs at the top.
- Pick: logging sets and reps during a workout. Not jobs to tick (`Checklist`), not timing one activity
  (`Timer`), not a run on a route (`Route`).
- Writes: `exercises` of `name` text(28), `sets` of `weight` number optional, `reps` number optional,
  `seconds` number optional (timed sets), `done` boolean, 1–8, 1–6; `rest` seconds 0–600 (default 90);
  `unit` (`kg`, `lb`).
- Parts → actions: sets `weight type`, sets `reps type`, sets `done check`, `rest stop`, `finish press`
  (the screen's only primary action).
- States: filled, empty, success (finished). · Real path: sets stored on the device.
- Kit: `KitSetRow`.
- Wave 6 options: add `style: "sets" | "interval"` (EMOM, AMRAP and timed circuit rounds) plus optional `rpe` (1–10) and `note`.

### `Exercise` · planned · content · phone
One exercise explained: a photo or looping clip, the muscles it works, three short cues, the equipment, and
the person's best and last result.
- Pick: how to do one exercise and how it went last time. Not a lesson in a course (learning `Lesson`), not
  a whole workout (`Workout`).
- Writes: `name` text(28), `photo`, `muscles` text(16) each, 1–3; `cues` text(60) each, 1–3; `equipment`
  text(20) optional; `best` text(16) optional; `last` text(16) optional.
- Parts → actions: `start press` (adds it to a workout). · States: filled, loading.
- Real path: an exercise library bundled with the app.
- Wave 6 options: add optional looping `video` media alongside `photo` and `style: "detail" | "compact"`.

### `Measurements` · planned · data · phone
One body measurement over weeks as a line with a dashed goal line, the latest value large, the change since
the start, and range tabs (month, three months, year).
- Pick: one body measurement moving toward a goal. Not a holding's price (money `PriceChart`), not business
  numbers (data `LineChart`), not a short trend under a number (`Sparkline`).
- Writes: `label` text(20), `unit` text(8), `points` 4–52, `goal` number optional, `range` (`month`,
  `quarter`, `year`), `goto` (the add-a-measurement screen). The latest value and the change are computed.
- Parts → actions: `range select`, `add press` (goes to `goto`). · States: filled, empty, loading.
- Real path: measurements typed in on the device; reading a scale or the phone's health store is `ok`.
- Wave 6 options: extend `range` with `week` and `all`, support optional second and third series, and add `style: "line" | "bars"`.

### `Medication` · planned · input · phone
Today's doses by time of day: each medicine with its dose, the time, a taken or skipped mark, pills left,
and a refill warning in `warn` when few remain.
- Pick: taking medicines or supplements on schedule. Not general jobs (`Checklist`), not one count
  (`Counter`).
- Writes: `doses` of `name` text(24), `dose` text(16), `time` HH:MM, `status` (`due`, `taken`, `skipped`),
  `left` number optional, 1–8; `refillAt` number optional. The refill warning is computed.
- Parts → actions: due doses `taken check`, doses `skip press` (confirm). Completed and unavailable rows are read-only.
- States: filled, empty, success (all doses recorded taken), error (logging unavailable; preserve the last known details).
- Real path: doses stored on the device; reminders need notifications (`ok`).
- Motion: enter with the saved schedule visible and keep time, name and dose anchored. A local log updates only the acted-on row and removes its unavailable actions; move focus to that row's recorded status. Skip uses the kit confirmation; cancelling returns to Skip unchanged. No success celebration, idle motion or custom exit. Reduced motion uses the same immediate row cut and kit confirmation fallback.
- Wave 6 options: add `asNeeded` (`PRN`) boolean, `instruction` text(40), and `style: "today" | "cabinet"`.

### `HabitGrid` · planned · input · phone
Several habits down the side and this week's days across, a tick per cell, today's column highlighted, and
each habit's streak at the end of its row.
- Pick: several habits across this week. Not one habit's run of days (`Streak`), not today's jobs
  (`Checklist`), not many weeks of activity (data `Heatmap`).
- Writes: `habits` of `name` text(20), `icon`, `days` exactly 7 booleans, 1–6. Streaks are computed.
- Parts → actions: cells `root check` (today and past days). · States: filled, empty.
- Real path: habit records on the device. · Kit: `KitWeekMatrix`.

### `Vitals` · planned · data · phone
Readings with their healthy range: each as a value with unit, a band showing low, normal and high with the
reading placed on it, the time taken, and a status in neutral or `warn`, never `bad`.
- Pick: readings that have a normal range (blood pressure, heart rate, glucose, temperature). Not
  numbers without a range (`Stats`), not progress toward a goal (`Progress`).
- Writes: `readings` of `label` text(20), `value` number, `value2` number optional (the second number of
  a blood pressure), `unit` text(8), `low` number, `high` number, `at` text(12), 1–4; `goto` (the add screen).
  "In range" or "outside range" is computed, shown in neutral and `warn`, never `bad`: it is not a verdict.
- Parts → actions: readings `root press`, `add press` (goes to `goto`). · States: filled, empty.
- Real path: readings typed in, or read from a device through the phone's health store (`ok`).
- Wave 6 options: add `context` (`resting`, `fasting`, `post_meal`, `active`) and `style: "band" | "history"`.

### `SymptomLog` · planned · input · phone
Today's symptoms as tappable chips grouped by area (head, stomach, skin, energy), each chosen one showing a
severity from one to five and an optional note.
- Pick: noting several symptoms and how bad each is. Not one level for the day (`Scale`), not filters
  (`Chips`), not feelings (mind `Feelings`).
- Writes: `groups` of `label` text(16), `symptoms` of `label` text(16), `severity` 0–5, 2–8, 1–4.
- Parts → actions: symptoms `root toggle`, symptoms `severity set`. · States: filled.
- Real path: symptom entries stored on the device.

### `Cycle` · planned · data · phone
A menstrual cycle as a ring of days: today's day number and phase in the middle, period days, the predicted
next period and the fertile window marked, with "Log period" below. It says plainly that it is not a method
of contraception.
- Pick: following a menstrual cycle. Not progress toward a goal (`Ring`), not days with something marked
  (`Calendar`).
- Writes: `start` date (the last period's first day), `length` 21–40 (average cycle), `period` 2–10 (days).
  Today's day, the phase, the next period and the fertile window are computed.
- Parts → actions: `log press`. · States: filled, empty.
- Real path: logged period dates on the device only; predictions computed locally, never shared.
- Wave 6 options: add `mode` (`track`, `conceive`, `pregnancy`) and optional link to `SymptomLog`.

### `ActivityRings` · planned · data · phone
Two or three concentric rings for the day's goals (move, exercise, stand; steps, minutes, water), each in
its own tone, with the values listed beside them.
- Pick: two or three daily goals at once. Not one goal (`Ring`), not targets shown as bars (`Progress`).
- Writes: `rings` of `label` text(16), `value` number, `of` number, `unit` text(8), 2–3.
- States: filled, loading. · Signature: `ring_fill`.
- Real path: totals from the device, or from the phone's health store (`ok`).
- Wave 6 options: add `style: "rings" | "score"` (0–100 readiness or bio-age headline ring surrounded by 3 factor rings).

### `CardioSession` · planned · data · ok
A live or completed endurance workout such as a run, ride, walk, swim or hike showing the elapsed clock, distance, pace, elevation gain and heart-rate zone. Per-kilometre or per-mile split rows appear underneath with relative pace bars so fast and steady segments stand out.
- Pick: endurance cardio telemetry and pace splits. Not strength sets and reps (`Workout`), place stops (`Route`), or one stopwatch alone (`Timer`).
- Writes: `activity` (`run`, `ride`, `walk`, `swim`, `hike`), `startedAt` ISO datetime with offset, `elapsedSeconds` number ≥ 0, `distance` number ≥ 0, `unit` (`km`, `mi`), `elevation` number optional, `hrAvg` number optional, `hrZone` 1–5 optional, `splits` of `label` text(8), `seconds` number > 0, `elevationDelta` signed number optional, 0–30; `live` boolean (default false); `style`. Average pace/speed and relative split pace bars are computed by code.
- Styles: `summary` (default, headline metrics and split pace bars), `live` (active workout telemetry with start, pause, resume, lap and finish controls).
- Parts → actions: `start start`, `pause pause`, `resume play`, `lap press`, `finish stop`.
- States: filled, empty, loading, success (session saved), error (location or health sensor unavailable).
- Real path: live GPS distance and heart-rate telemetry read with device location and health-store permissions (`ok`), or entered manually on the phone.
- Density: `meta.dense: true`, weight 3; endurance sessions display up to 30 per-split telemetry rows.

### `TrainingPlan` · planned · input · phone
A multi-week structured workout program organized by week and day showing each day's focus label, duration and rest-day markers. Completed workouts show ticks, and tapping an active day launches the linked `Workout` or `CardioSession`.
- Pick: multi-day workout splits and progressive fitness programs. Not one active session (`Workout`), daily habits (`HabitGrid`), or course paths (learning `Path`).
- Writes: `title` text(32), `weeks` 1–12, `currentWeek` 1–12, `days` of `week` 1–12, `day` 1–7, `label` text(24), `minutes` 0–240, `rest` boolean, `done` boolean, `goto` optional, 1–28; `style`. Weekly completion counts and overall program progress are computed by code.
- Styles: `week` (default, week selector chips above the seven daily workout rows), `list` (sequential multi-week schedule list).
- Parts → actions: `week select`, days `done check`, days `root press` (opens `goto`).
- States: filled, empty, loading, success (day completed), error (save failed).
- Real path: training program schedules and completion ticks stored locally on the device.
- Density: `meta.dense: true`, weight 3; multi-week plans hold up to 28 day entries across weeks.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `today` | My health today | `rings`, `meds` | `rings`: Header, ActivityRings, HabitGrid · `meds`: Header, Medication, Streak, Button |
| `workout` | A session | `log`, `cardio`, `plan`, `exercise`, `history` | `log`: Header, Timer[up], Workout · `cardio`: Header, CardioSession, Note · `plan`: Header, TrainingPlan, Note · `exercise`: Header[back], Exercise, Stats · `history`: Header, Calendar[month], List |
| `body_trends` | How my body is changing | `measure`, `summary`, `add` | `measure`: Header, Measurements, Stats · `summary`: Header, Segmented, Bars, Stats · `add`: Header, Field[number], Field[date], Button |
| `bodylog` | Log how my body is | `symptoms`, `vitals`, `cycle`, `med_edit` | `symptoms`: Header, Scale[mood], SymptomLog, Composer[entry], Button · `vitals`: Header, Vitals, Note · `cycle`: Header, Cycle, Calendar[month] · `med_edit`: Header, Field, Field[time], Field[repeat], Button |

## Worked example: Rep

A home gym log. `today/rings` shows minutes, sessions this week and water; `workout/log` runs a push day of
five exercises with weights and reps, rest counting down after each tick; `progress/measure` shows body
weight falling toward a dashed goal on `body_trends/measure`. A second take swaps in `Medication` for someone on a supplement plan.
Signature: `ring_fill` on `ActivityRings`.

## Tiers

All `phone`. Reading from the phone's health store or a connected scale or watch is an `ok` part (read
permission), named in each real path.

## Build notes

- Order: `Workout`, `Medication`, `HabitGrid`, `Measurements`, `ActivityRings`, `Exercise`, `Vitals`,
  `SymptomLog`, `Cycle`, then Wave 6 additions `CardioSession` and `TrainingPlan`.
- `Workout` reads one line per exercise ("Bench press: 60×8 ✓, 60×8 ✓, 62.5×6"), not a cell per box.
- `Vitals` and `Cycle` never state a diagnosis; ranges are the person's own or common reference values.
- **Wave 6 additions & options:**
  - Added `CardioSession` (`data`, `ok`) for endurance cardio telemetry and pace splits, and `TrainingPlan` (`input`, `phone`) for multi-week structured workout programs.
  - Option/style upgrades: `ActivityRings` gains `style: "rings" | "score"` (0–100 readiness / bio-age ring + 3 factors); `Workout` gains `style: "sets" | "interval"` plus `rpe` (1–10) and `note`; `Exercise` gains optional looping `video` and `style: "detail" | "compact"`; `Measurements` gains `range: "week" | "all"`, up to 3 series and `style: "line" | "bars"`; `Medication` gains `asNeeded`, `instruction` and `style: "today" | "cabinet"`; `Vitals` gains `context` and `style: "band" | "history"`; `Cycle` gains `mode` (`track`, `conceive`, `pregnancy`) and `SymptomLog` link.

## Open questions

- **Sleep?** In `mind` (`SleepLog`), because people log it with mood; a health app loads both packs.
