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

### `Chores` · planned · input · people
Chores with who does each (an avatar), how often, when it is next due, and points; ticking one gives the
points to that person and moves its next date on.
- Pick: shared household jobs with an owner, a repeat and points. Not one person's jobs today
  (`Checklist`), not staff shifts (team `Shift`), not care for one pet or plant (`CareSchedule`).
- Writes: `chores` of `title` text(28), `who` text(16), `photo`, `repeat` (`daily`, `weekly`, `monthly`,
  `once`), `due` date, `points` 0–100 optional, `done` boolean, 1–6. Next dates are computed.
- Parts → actions: items `done check`, items `root press`. · States: filled, empty, success.
- Real path: chores on the device; each person ticking their own needs a shared app.
- Aliases: chores, chorechart, housework, cleaning.

### `Rewards` · planned · data · phone
Each child's points or pocket money as a jar filling up, and a shelf of prizes with their cost; a prize is
claimable when the jar holds enough.
- Pick: points earned and spent on prizes. Not a business's stamp card (customers `Loyalty`), not one's own
  goal (`Ring`), not badges for milestones (learning `Achievements`).
- Writes: `kids` of `name` text(16), `photo`, `points` number, 1–4; `prizes` of `title` text(24), `cost`
  number, `icon`, 1–6; `money` boolean (points are pocket money).
- Parts → actions: prizes `claim press` (in `confirmParts`), kids `root press`. · States: filled, success.
- Real path: points kept on the device by a parent. · Aliases: rewards, points, pocketmoney, stars, prizes.

### `CareSchedule` · planned · input · phone
Recurring care for one thing or many: water, feed, walk, vet, flea treatment, oil change, boiler service;
each with when it was last done, when it is next due, overdue in `bad`, and a done button that logs it.
- Pick: looking after a pet, plant, car or house on a repeat. Not shared chores with points (`Chores`), not
  medicine for a person (health `Medication`), not appointments with a provider (booking `Appointment`).
- Writes: `tasks` of `title` text(24), `for` text(16) optional, `icon`, `every` text(16), `last` date
  optional, `next` date, 1–6. Overdue and due-today are computed.
- Parts → actions: tasks `done press`, tasks `root press`. · States: filled, empty, success.
- Real path: tasks on the device; reminders need notifications (`ok`).
- Aliases: careschedule, care, maintenance, servicing, petcare, plantcare.

### `Turns` · planned · data · people
Whose turn it is: a rotation of people around a job (dishes, bins, cooking, driving), the current person
large, the next two after, and "Done, next".
- Pick: a job that rotates through people. Not a list of chores (`Chores`), not a week of shifts (team
  `Roster`).
- Writes: `job` text(24), `people` of `name` text(16), `photo`, 2–6, `at` index.
- Parts → actions: `next press`, `skip press`. · States: filled.
- Real path: the rotation on the device; everyone seeing it needs a shared app. · Aliases: turns, whoseturn, rotation.

### `Agenda` · planned · data · people
The family's next days in one list: each day as a heading, its events with time, title and the coloured
initial of who it is for (or "everyone"), and conflicts flagged.
- Pick: several people's plans over the coming days together. Not one day by the hour (`Timeline`), not a
  month of marked days (`Calendar`), not a class timetable (learning `Timetable`).
- Writes: `days` of `date`, `events` of `time` HH:MM optional, `title` text(32), `who` text(12) each 1–4,
  1–6, 1–7. Conflicts are computed.
- Parts → actions: events `root press`, `add press`. · States: filled, empty.
- Real path: events on the device; a family calendar needs a shared app or a calendar service.
- Aliases: agenda, familycalendar, upcoming, whatson.

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
  `lock`, `fan`, `blind`), `on` boolean, `level` 0–100 optional, 1–6, 1–4.
- Parts → actions: devices `root toggle`, devices `level set`. · States: filled, loading.
- Real path: a smart-home service controls the devices; without it this is a mock-up.
- Aliases: devices, smarthome, lights, thermostat.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `family` | The household this week | `board`, `agenda` | `board`: Header, People[stack], Chores, Turns · `agenda`: Header, Calendar[week], Agenda |
| `kids` | Points and prizes | `jar` | Header, Rewards, Chores |
| `care` | Looking after a thing | `subject`, `all` | `subject`: Header[back], Profile, KeyValue, CareSchedule, Timeline[history] · `all`: Header, Chips, CareSchedule |
| `baby` | The baby's day | `today` | Header, BabyLog, Stats |

`Devices` is used on a `home` archetype screen (core) as the body: Header, Segmented, Devices.

## Worked example: Ledge, extended

Ledge, the core's plant-care example, as a household app. `care/all` shows today's waterings and the
fortnightly feed for 12 plants, overdue ones first; a fern's `care/subject` page shows its photo, light and
watering facts, and its care history. Flatmates share the jobs on `family/board`, with `Turns` for whose
turn it is to mist. Signature: `check_burst` when today's care is done.

## Aliases that shadow the core

No alias here matches a core alias; the core alias `household` stays with `People`.

## Tiers

`Devices` needs a smart-home service. `Chores`, `Turns` and `Agenda` are fully useful only shared, so they
are `people`; one parent running them on one phone works too.

## Build notes

- Order: `CareSchedule`, `Chores`, `Rewards`, `Turns`, `Agenda`, `BabyLog`, `Devices`.
- Dates that follow from a repeat (next due, overdue) are computed by code; the model writes the first date.

## Open questions

- **Bins and recycling days?** Default: `CareSchedule` with an `every` of "Tuesday, every other week".
