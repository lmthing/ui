# `mind` pack

**Status:** new · **Wave:** 3 · **Pick line:** The mind: mood, journaling, feelings, breathing, sleep. Not
the body (`health`).

## Purpose

Looking after how one feels: a daily check-in of mood and what affected it, a journal, naming feelings,
breathing exercises, sleep, calming sounds, and the patterns that show up over weeks. It is calm by design:
soft presets, no red alarms, nothing competitive.

## Apps it serves

Mood diary, gratitude or reflection journal, anxiety toolkit with breathing, sleep log, meditation timer and
library (with `media`), self-care check-in, therapy homework between sessions, a teen's feelings journal.

## What the core already covers

- How the day felt, one to five: `Scale` style `mood`; a month of moods as colours: `Calendar` style `month`
  with tones.
- Writing: `Composer` style `entry`; today's prompt: `Card` or `Note` style `quote`.
- A guided meditation: `Player` style `audio`; a silent sit: `Timer` style `down`.
- Days in a row: `Streak`; self-care jobs: `Checklist`; an affirmation deck: `SwipeStack`.

A separate mood picker, mood chart, gratitude list or meditation session would each be a near miss with the
core components above, so the pack holds only what they cannot say.

## Components (7)

### `Entries` · planned · content · phone
A journal as a feed: each entry with its date, a mood face, the first two lines of text, its tags and a
photo thumbnail, newest first, grouped by month.
- Pick: the person's past journal entries. Not posts by other people (social `Feed`), not saved quotes from
  books (media `Highlights`), not things in general (`List`).
- Writes: `entries` of `date`, `mood` 1–5 optional, `text` text(160), `tags` text(12) each 0–3, `photo`
  optional, `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: entries stored on the device only.

### `Factors` · planned · input · phone
What shaped today as a grid of icon tiles (slept well, exercise, friends, work, caffeine, outdoors), tap to
mark; several can be on.
- Pick: tagging what happened in the day, with icons, more than six at once. Not a few one-word filters
  (`Chips`), not symptoms with severity (health `SymptomLog`), not shortcuts (`Actions`).
- Writes: `items` of `label` text(14), `icon`, `on` boolean, 4–16.
- Parts → actions: items `root toggle`. · States: filled.
- Real path: tags stored with the day's entry.

### `Feelings` · planned · input · phone
Words for feelings grouped by family (calm, happy, sad, anxious, angry, tired), the family chosen first and
then up to three precise words within it.
- Pick: naming exactly what one feels. Not a level from one to five (`Scale`), not what happened
  (`Factors`), not physical symptoms (health `SymptomLog`).
- Writes: `families` of `label` text(14), `words` text(16) each, 3–8, 3–6; `chosen` text(16) each, 0–3.
- Parts → actions: families `root select`, words `root toggle`. · States: filled.
- Real path: chosen words stored with the day's entry.

### `Breathe` · planned · action · phone
A breathing exercise: a soft circle that grows on the in-breath, holds, and shrinks on the out-breath, the
phase word inside it, rounds left under it, and start and pause.
- Pick: a paced breathing exercise. Not timing an activity (`Timer`), not playing a recording (`Player`).
- Writes: `pattern` (`box` 4-4-4-4, `calm` 4-7-8, `even` 5-5, `custom`), `rounds` 1–20; with `custom`
  only, `inhale`, `hold`, `exhale` and `rest` seconds 0–10.
- Parts → actions: `circle play`, `circle pause`. · States: filled, success (done).
- Real path: a paced animation on the device, with optional gentle haptics.
- Kit: `KitBreath`.

### `SleepLog` · planned · data · phone
Last night's sleep: bedtime and wake time, the hours slept large, a bar across the night showing awake and
asleep, a quality face, and the week's average.
- Pick: how one night or week of sleep went. Not a day's plan by the hour (`Timeline`), not a level alone
  (`Scale`).
- Writes: `bed` HH:MM, `wake` HH:MM, `awake` minutes optional, `quality` 1–5 optional, `week` exactly 7
  numbers optional (hours per night, seed values), `goto` (the sleep entry screen). Hours and the average
  are computed.
- Parts → actions: `edit press` (goes to `goto`). · States: filled, empty.
- Real path: times typed in, or read from the phone's sleep data (`ok`).

### `Soundscape` · planned · input · phone
Calming sounds to mix: tiles for rain, waves, wind, fire, birds and noise, each with its own volume slider,
a play button and a sleep timer.
- Pick: mixing background sounds to relax or sleep. Not one recording (`Player`), not a list of tracks
  (media `Playlist`).
- Writes: `sounds` of `label` text(14), `icon`, `level` 0–10, 2–6; `timer` minutes 0–120.
- Parts → actions: sounds `level set`, `mix play`, `mix pause`, `timer set`. · States: filled.
- Real path: sound loops bundled with the app, played on the device.

### `Patterns` · planned · data · phone
What tends to go with good and bad days: up to four findings as short sentences ("Mood is higher on days
with exercise"), each with a pair of small bars comparing days with and without it. Code finds the
findings, writes the sentences from copy and computes the bars; a model only chooses which factors to show.
- Pick: links between what the person logs and how they feel. Not one trend (`Sparkline`), not
  a general chart (`Bars`).
- Writes: `factors` text(14) each, 1–4 (labels from the screen's `Factors`), `minDays` 7–60 (default 14).
- States: filled, empty (too few days logged). · Real path: averages computed on the device from entries.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `checkin` | How I am today | `quick`, `full` | `quick`: Header, Scale[mood], Factors, Button · `full`: Header, Scale[mood], Feelings, Factors, Composer[entry], Button |
| `settle` | Settle down now | `breathe`, `sounds` | `breathe`: Header, Breathe, Note · `sounds`: Header, Soundscape, Note |
| `insights` | What I have learned | `week` | Header, SleepLog, Patterns, Stats |
| `sleep` | Log a night | `log` | Header, Field[time], Field[time], Scale, Button |

With `mind` loaded, the core `journal` archetype uses `Entries` in place of `Card` (`entries`: Header,
Streak, Entries, Button) and gains `month`: Header, Calendar[month], Entries.

## Worked example: Tide

A mood and sleep journal. Each evening `checkin/full` asks for a mood face, two feeling words and what
shaped the day; the core `journal` shows a 9-day `Streak` and the entries; `settle/breathe` runs box breathing
before bed; after two weeks `insights` shows "Mood is higher on days outdoors". Signature: `streak_flame`.

## Tiers

All `phone`. Reading sleep from the phone is an `ok` part. Entries never leave the device by default.

## Build notes

- Order: `Entries`, `Factors`, `Feelings`, `Breathe`, `SleepLog`, `Soundscape`, `Patterns`.
- The pack prefers the `calm`, `soft` and `night` presets in the Director's pick line.
- `Patterns` needs at least 14 logged days; before that it shows its empty state with the days left.

## Open questions

- **Crisis help?** Default: every `mind` app's settings include a `List` row to the person's local crisis
  line, written by code from the locale, never by the model.
