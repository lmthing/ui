# `home` pack

**Status:** new · **Wave:** 2 · **Pick line:** Running a household: chores, family, pets, plants, cars, the
house and its devices. Not a business team (`team`).

## Purpose

The work of a home shared among the people in it: chores and whose turn it is, rewards for kids, the family's
week, recurring care for pets, plants, the car and the house, a baby's feeds and sleeps, and the devices in
the rooms, including set points, one-tap scenes and sensor readings.

## Apps it serves

Family chore chart, flatmates' cleaning rota, kids' rewards and pocket money, family organiser, pet care
(feeding, walks, vet), plant care (Ledge), car service and MOT reminders, home maintenance, baby tracker,
smart-home panel, thermostat control, household scenes and indoor sensor monitor.

## What the core already covers

- The household's people: `People`; one pet, plant, car or child: `Profile` with `KeyValue`.
- Today's jobs: `Checklist`; a record of care done: `Timeline` style `history`.
- Which days have something: `Calendar`; a habit: `Streak`; a count (walks this week): `Counter`, `Stats`.
- How often something repeats: `Field` kind `repeat`; a photo of the plant today: `Camera`.
- A manually logged sensor value or short history: `Stats`, `KeyValue`, `Sparkline`; a stored preferred
  temperature on a form: `Field` kind `number` or `slider`; choosing a mode: `Chips`. They do not send
  device commands or compare a live reading with its configured normal range.
- Navigation shortcuts are `Actions`; one local preference is a `List` toggle. A household scene
  applies several device settings, so it is an option on `Devices`, not an app-navigation shortcut.

The first plan's draft `Subject`, `CareLog` and `Household` are dropped: they were `Profile`, `Timeline`
and `People` again. No separate `Climate`, `Scenes` or sensor component is added: the existing `Devices`
heat control can be focused, and its room grid can hold sensors and saved scene commands.

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

### `Rewards` · planned · data · phone

Each child's points or pocket money as a jar filling up, and a shelf of prizes with their cost; a prize is
claimable when the jar holds enough.

- Pick: points earned and spent on prizes. Not a business's stamp card (customers `Loyalty`), not one's own
  goal (`Ring`), not badges for milestones (learning `Achievements`).
- Writes: `kids` of `name` text(16), `photo`, `points` number, `goto`, 1–4; `prizes` of `title` text(24),
  `cost` number, `icon`, 1–6; `money` boolean (points are pocket money).
- Parts → actions: prizes `claim press` (in `confirmParts`), kids `root press`. · States: filled, success.
- Real path: points kept on the device by a parent.

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

### `Turns` · planned · data · phone

Whose turn it is: a rotation of people around a job (dishes, bins, cooking, driving), the current person
large, the next two after, and "Done, next".

- Pick: a job that rotates through people. Not a list of chores (`Chores`), not a week of shifts (team
  `Roster`).
- Writes: `job` text(24), `people` of `name` text(16), `photo`, 2–6, `at` index.
- Parts → actions: `next press`, `skip press`. · States: filled.
- Real path: the rotation on the device; everyone seeing it on their own phone is `people` (`partTiers`).

### `Agenda` · planned · data · phone

The family's next days in one list: each day as a heading, its events with time, title and the coloured
initial of who it is for (or "everyone"), and conflicts flagged.

- Pick: several people's plans over the coming days together. Not one day by the hour (`Timeline`), not a
  month of marked days (`Calendar`), not a class timetable (learning `Timetable`).
- Writes: `days` of `date`, `events` of `time` HH:MM optional, `title` text(32), `who` text(12) each 1–4,
  1–6, 1–7; `goto` (the add-event screen). Conflicts are computed.
- Parts → actions: events `root press`, `add press` (goes to `goto`). · States: filled, empty.
- Real path: events on the device; a shared family calendar is `people`, a synced one `service`.

### `BabyLog` · planned · input · phone

Quick tiles for a baby's day (feed left, feed right, bottle, nappy, sleep) with a running timer for feeds and
sleeps, and today's log under them with the time since the last of each.

- Pick: logging a baby's feeds, nappies and sleeps. Not an adult's habits (health `HabitGrid`), not timing
  one thing (`Timer`).
- Writes: `log` of `kind` (`feed_left`, `feed_right`, `bottle`, `nappy`, `sleep`), `time` HH:MM,
  `minutes` number optional, `amount` text(10) optional, 0–12; `running` (`none` or a kind).
- Parts → actions: tiles `root start`, tiles `root stop`, log items `root press`. · States: filled, empty.
- Real path: entries on the device; two parents sharing needs a shared app.

### `Devices` · planned · input · service

The home's devices by room as tiles, with optional saved scenes that apply several settings in one tap.
A focused device has large controls: a thermostat shows the measured temperature beside its set point
and minus/plus controls; a sensor shows its reading, normal range and a code-derived out-of-range mark.

- Pick: reading or controlling connected household devices, including a thermostat or a multi-device
  scene. Not app preferences (`List` toggles, `Field`), navigation (`Actions`), or a manually recorded
  measurement (`Stats`, `Sparkline`; health `Vitals` is for a person's body).
- Writes: `rooms` of `label` text(16), `devices` of `key` text(24) (unique across rooms), `name` text(16),
  `kind` (`light`, `heat`, `plug`, `lock`, `fan`, `blind`, `sensor`), `on` boolean for switches/heat/locks
  only (`lock`: true means locked), `level` 0–100 optional for light/fan/blind (brightness/speed/open),
  `temp` 5–30 for heat only (required set point in °C), `reading` number optional for heat/sensor
  (required for sensor), `unit` (`celsius`, `percent`, `ppm`, `lux`) for sensor only, `normal` of `low`
  and `high` numbers optional for sensor (`low` ≤ `high`), `goto` optional (the focused screen), 1–6
  devices per room, 1–4 rooms. Heat readings use °C; locale conversion is display-only. · Dense.
- Writes also: `scenes` of `name` text(24), `targets` of device `key` and one or more of `on`, `level`,
  `temp` with the same limits, 2–6 distinct targets, 0–6 scenes (default empty); `focus` device key
  optional; `style`. Reject unknown target/focus keys, sensor targets and unsupported target settings.
  Write readings and configured ranges, never an out-of-range/active-scene flag or command outcome.
- Styles: `tiles` (default: scene tiles above the room grids), `focused` (one device's values and
  controls enlarged; `focus` chooses it, otherwise code uses the first device). Same device data and
  actions in both styles; sensors remain read-only and scenes stay available.
- Parts → actions: devices `root toggle` (light/heat/plug/fan), `lock toggle` (locks only),
  `controls press` (when linked), `level set` (light/fan/blind), `temp set`, `minus decrement`,
  `plus increment` (heat, steps of 0.5 °C within 5–30). All inherit `service`.
- Scene items `apply press` (no lock targets) or `secure press` (any lock target), chosen by code.
  `meta.confirmParts`: `lock`, `secure`; the standard confirm sheet precedes any lock change, including
  through a scene. Ordinary scenes remain one tap; no new action names or model-written safety flags.
- States: filled, empty (no devices), loading (including pending commands), success (acknowledged),
  error (offline or a failed/partly applied scene). Disabled controls stay readable.
- Real path: a host adapter maps local device keys to a smart-home service and supplies readings,
  availability and command acknowledgements. Without it this is a labelled mock, never a real switch.

## Archetypes (5)

| Archetype | Job                            | Layouts                                | Recipe                                                                                                                                                                     |
| --------- | ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `family`  | The household this week        | `board`, `agenda`, `leaders`           | `board`: Header, People[stack], Chores, Turns · `agenda`: Header, Calendar[week], Agenda · `leaders`: Header, Segmented, List[ranked]                                      |
| `kids`    | Points and prizes              | `jar`                                  | Header, Rewards, Chores                                                                                                                                                    |
| `care`    | Looking after a thing          | `subject`, `all`, `photo`              | `subject`: Header[back], Profile, KeyValue, CareSchedule, Timeline[history] · `all`: Header, Chips, CareSchedule · `photo`: Header, Camera, Note, Button                   |
| `baby`    | The baby's day                 | `today`                                | Header, BabyLog, Stats                                                                                                                                                     |
| `house`   | The house's devices and scenes | `rooms`, `home_control`, `home_scenes` | `rooms`: Header, Segmented, Devices[tiles], Note · `home_control`: Header[back], Devices[focused], Note · `home_scenes`: Header, Devices[tiles] (saved scenes first), Note |

## Worked example: Ledge, extended

Ledge, the core's plant-care example, as a household app. `care/all` shows today's waterings and the
fortnightly feed for 12 plants, overdue ones first; a fern's `care/subject` page shows its photo, light and
watering facts, and its care history. Flatmates share the jobs on `family/board`, with `Turns` for whose
turn it is to mist. `house/home_control` shows the room thermostat's reading and set point, while
`house/rooms` includes a humidity sensor and its normal range. `house/home_scenes` offers a saved
evening scene for the lights and heating, with a separate confirmation if a scene changes a lock.
Signature: `check_burst` when today's care is done.

## Tiers

Every `Devices` command, scene and live reading needs a smart-home service (`service`); the kit never
connects to hardware itself. Phone-only mock state must not claim an acknowledged real-device change.
`Chores`, `Turns` and `Agenda` are fully useful only shared, so they are `people`;
one parent running them on one phone works too.

## Build notes

- Order: `CareSchedule`, `Chores`, `Rewards`, `Turns`, `Agenda`, `BabyLog`, `Devices`.
- Dates that follow from a repeat (next due, overdue) are computed by code; the model writes the first date.
- Widen `Devices`, do not add component files. Compose thermostat controls from kit number/slider
  bases, scene tiles from action bases, and sensor readings/ranges from data bases; no dial-specific
  base or new signature is needed. Device details use a linked focused screen, not a `Sheet` containing
  arbitrary controls (core `Sheet` supports only its own detail/picker/menu items).
- Validate scene references and capabilities before dispatch. Compare sensor readings to inclusive
  normal bounds in canonical units; code derives warning tone and scene matches from confirmed live
  values, not props written by a model. Use shared copy for readings, set points, units and warnings.
- Host callbacks send commands and return confirmed values; keep pending targets disabled and do not
  report success on a tap. A failed scene lists the failed targets without claiming atomic application,
  automatic rollback or blindly retrying targets that already succeeded.
- Add thermostat/sensor and multi-device-scene examples plus choose/write/read near misses against
  `Field`, `Actions`, `List`, `Stats` and health `Vitals`; test limits, normal-range edges, scene key
  validation, direct/scene lock confirmation, pending and partial-failure states when built.

## Open questions

- **Bins and recycling days?** Default: `CareSchedule` with an `every` of "Tuesday, every other week".
- **A new climate or scenes id?** Default: no. Focused heat controls and optional scene tiles widen the
  existing device surface without another choice; a history still uses core `Sparkline`.
- **Temperature units and thermostat modes?** Default: existing 5–30 °C set points, 0.5 °C steps,
  locale display conversion and `on` for enabled/off. Dual heating/cooling targets, schedules and
  vendor-specific modes wait for misses, rather than guessing unsupported capabilities.
- **Sensor normal ranges and scenes while offline?** Default: store ranges with the sensor, derive
  out-of-range from the reading, and omit the mark without a range. The host owns availability; stale
  readings are labelled and commands disabled. A scene is a fixed set of absolute targets, not a
  toggle or an automation rule; it is active only when all confirmed targets match.
