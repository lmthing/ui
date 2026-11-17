# `home` pack

**Status:** new · **Wave:** 2 · **Pick line:** Running a household: chores, family, pets, plants, cars, the
house itself. Not a business team (`team`).

## Purpose

The work of a home shared among the people in it: chores and whose turn it is, rewards for kids, the family's
week, recurring care for pets, plants, the car and the house, a baby's feeds and sleeps, and the devices in
the rooms.

## Apps it serves

Family chore chart, flatmates' cleaning rota, kids' rewards and pocket money, family organiser, pet care
(feeding, walks, vet), plant care (Ledge), car service and MOT reminders, home maintenance, baby tracker,
smart-home panel.

## What the core already covers

- The household's people: `People`; one pet, plant, car or child: `Profile` with `KeyValue`.
- Today's jobs: `Checklist`; a record of care done: `Timeline` style `history`.
- Which days have something: `Calendar`; a habit: `Streak`; a count (walks this week): `Counter`, `Stats`.
- How often something repeats: `Field` kind `repeat`; a photo of the plant today: `Camera`.

The first plan's draft `Subject`, `CareLog` and `Household` are dropped: they were `Profile`, `Timeline`
and `People` again.

## Components (7)

### `Chores` · planned · input · phone
Chores with who does each (an avatar), how often, when it is next due, and points; ticking one gives the
points to that person and moves its next date on.
- Pick: shared household jobs with an owner, a repeat and points. Not one person's jobs today
  (`Checklist`), not staff shifts (team `Shift`), not care for one pet or plant (`CareSchedule`).
- Writes: `chores` of `title` text(28), `who` text(16), `photo`, `repeat` (core `Field` `repeat` values),
  `every` 1–12 (every 2 weeks), `last` date optional, `points` 0–100 optional, `goto`, 1–6. Due dates and
  done-for-now are computed from `last`.
- Parts → actions: items `done check`, items `root press`. · States: filled, empty, success.
- Real path: chores on the device; each person ticking their own on their phone is `people` (`partTiers`).
- Aliases: chores, chorechart, housework, cleaning.

### `Rewards` · planned · data · phone
Each child's points or pocket money as a jar filling up, and a shelf of prizes with their cost; a prize is
claimable when the jar holds enough.
- Pick: points earned and spent on prizes. Not a business's stamp card (customers `Loyalty`), not one's own
  goal (`Ring`), not badges for milestones (learning `Achievements`).
- Writes: `kids` of `name` text(16), `photo`, `points` number, `goto`, 1–4; `prizes` of `title` text(24),
  `cost` number, `icon`, 1–6; `money` boolean (points are pocket money).
- Parts → actions: prizes `claim press` (in `confirmParts`), kids `root press`. · States: filled, success.
- Real path: points kept on the device by a parent. · Aliases: rewards, points, pocketmoney, stars, prizes.

### `CareSchedule` · planned · input · phone
Recurring care for one thing or many: water, feed, walk, vet, flea treatment, oil change, boiler service;
each with when it was last done, when it is next due, overdue in `bad`, and a done button that logs it.
- Pick: looking after a pet, plant, car or house on a repeat. Not today's jobs (`Checklist`), not shared
  chores with points (`Chores`), not medicine for a person (health `Medication`), not appointments with a
  provider (booking `Appointment`).
- Writes: `tasks` of `title` text(24), `for` text(16) optional, `icon`, `repeat` (core `Field` `repeat`
  values), `every` 1–12, `last` date, `goto`, 1–12. Next, overdue and due-today are computed. · Dense.
- Signature: `check_burst` (the same moment as core `Checklist`).
- Parts → actions: tasks `done press`, tasks `root press`. · States: filled, empty, success.
- Real path: tasks on the device; reminders need notifications (`ok`).
- Aliases: careschedule, care, maintenance, servicing, petcare, plantcare.

### `Turns` · planned · data · phone
Whose turn it is: a rotation of people around a job (dishes, bins, cooking, driving), the current person
large, the next two after, and "Done, next".
- Pick: a job that rotates through people. Not a list of chores (`Chores`), not a week of shifts (team
  `Roster`).
- Writes: `job` text(24), `people` of `name` text(16), `photo`, 2–6, `at` index.
- Parts → actions: `next press`, `skip press`. · States: filled.
- Real path: the rotation on the device; everyone seeing it on their own phone is `people` (`partTiers`).
- Aliases: turns, whoseturn, rotation.

### `Agenda` · planned · data · phone
The family's next days in one list: each day as a heading, its events with time, title and the coloured
initial of who it is for (or "everyone"), and conflicts flagged.
- Pick: several people's plans over the coming days together. Not one day by the hour (`Timeline`), not a
  month of marked days (`Calendar`), not a class timetable (learning `Timetable`).
- Writes: `days` of `date`, `events` of `time` HH:MM optional, `title` text(32), `who` text(12) each 1–4,
  1–6, 1–7; `goto` (the add-event screen). Conflicts are computed.
- Parts → actions: events `root press`, `add press` (goes to `goto`). · States: filled, empty.
- Real path: events on the device; a shared family calendar is `people`, a synced one `service`.
- Aliases: familycalendar, familyweek, whatson.

### `BabyLog` · planned · input · phone
Quick tiles for a baby's day (feed left, feed right, bottle, nappy, sleep) with a running timer for feeds and
sleeps, and today's log under them with the time since the last of each.
- Pick: logging a baby's feeds, nappies and sleeps. Not an adult's habits (health `HabitGrid`), not timing
  one thing (`Timer`).
- Writes: `log` of `kind` (`feed_left`, `feed_right`, `bottle`, `nappy`, `sleep`), `time` HH:MM,
  `minutes` number optional, `amount` text(10) optional, 0–12; `running` (`none` or a kind).
- Parts → actions: tiles `root start`, tiles `root stop`, log items `root press`. · States: filled, empty.
- Real path: entries on the device; two parents sharing needs a shared app.
- Aliases: babylog, babytracker, feeds, nappies.

### `Devices` · planned · input · service
The home's devices by room as tiles: lights with a switch and brightness, a thermostat with the set
temperature, a plug, a lock; tapping a tile toggles it, holding opens its controls.
- Pick: switching things in the house. Not settings of the app (`List` with toggles), not shortcuts to
  screens (`Actions`).
- Writes: `rooms` of `label` text(16), `devices` of `name` text(16), `kind` (`light`, `heat`, `plug`,
  `lock`, `fan`, `blind`), `on` boolean, `level` 0–100 optional (brightness, speed, open), `temp` 5–30
  optional (`heat`, in °C, shown in °F by locale), 1–6, 1–4. · Dense.
- Parts → actions: devices `root toggle` (`lock` in `confirmParts`), devices `controls press` (opens the
  screen's `Sheet` with its level), devices `level set`. · States: filled, loading.
- Real path: a smart-home service controls the devices; without it this is a mock-up.
- Aliases: devices, smarthome, lights, thermostat.

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `family` | The household this week | `board`, `agenda`, `leaders` | `board`: Header, People[stack], Chores, Turns · `agenda`: Header, Calendar[week], Agenda · `leaders`: Header, Segmented, List[ranked] |
| `kids` | Points and prizes | `jar` | Header, Rewards, Chores |
| `care` | Looking after a thing | `subject`, `all`, `photo` | `subject`: Header[back], Profile, KeyValue, CareSchedule, Timeline[history] · `all`: Header, Chips, CareSchedule · `photo`: Header, Camera, Note, Button |
| `baby` | The baby's day | `today` | Header, BabyLog, Stats |
| `house` | The house's devices | `rooms` | Header, Segmented, Devices, Note |


## Worked example: Ledge, extended

Ledge, the core's plant-care example, as a household app. `care/all` shows today's waterings and the
fortnightly feed for 12 plants, overdue ones first; a fern's `care/subject` page shows its photo, light and
watering facts, and its care history. Flatmates share the jobs on `family/board`, with `Turns` for whose
turn it is to mist. Signature: `check_burst` when today's care is done.

## Aliases that shadow the core

With `home`: `agenda` → `Agenda` (otherwise `Timeline`; `Agenda`'s id equals that core alias on purpose).
The core alias `household` stays with `People`.

## Tiers

`Devices` needs a smart-home service. `Chores`, `Turns` and `Agenda` are fully useful only shared, so they
are `people`; one parent running them on one phone works too.

## Build notes

- Order: `CareSchedule`, `Chores`, `Rewards`, `Turns`, `Agenda`, `BabyLog`, `Devices`.
- Dates that follow from a repeat (next due, overdue) are computed by code; the model writes the first date.

## Open questions

- **Bins and recycling days?** Default: `CareSchedule` with an `every` of "Tuesday, every other week".
