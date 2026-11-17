# `learning` pack

**Status:** revised · **Wave:** 3 · **Pick line:** Teaching and practising: lessons, quizzes, flashcards,
classes and homework. Not a team's training rota (`team`).

## Purpose

Learning something step by step and checking it stuck: lessons, questions with feedback, flashcards with
spaced review, a path through units, results and badges, and a student's week of classes and homework.

## Apps it serves

Language practice, exam revision, driving theory test, a teacher's class quizzes, kids' times tables,
student planner (timetable and homework), music theory drills, staff onboarding training, anatomy or law
flashcards.

## What the core already covers

- Progress through a course: `Ring`, `Progress`; a daily habit: `Streak`; a ranking: `List` style `ranked`.
- A lesson video or audio: `Player`; choosing among options with a sentence each: `Choice`.
- Units to scan: `List`; a timer for a test: `Timer`; place in a lesson: `Steps`.

The first plan's `Leaderboard` (then in `social`) is core `List` style `ranked`, and its `Score` is renamed
`Result` so it is not confused with core `Scale` (alias `score`).

## Components (8)

### `Lesson` · planned · content · phone
One lesson step: a short explanation, an optional picture, an example in a tinted box, and continue.
- Pick: teaching one idea before practising it. Not an article (media `Article`), not a question (`Quiz`).
- Writes: `title` text(40), `text` text(400), `example` text(160) optional, `photo` optional. The step
  number is a `Steps` above it.
- Parts → actions: `next press`. · States: filled.
- Real path: lesson content stored with the app. · Aliases: lesson, explanation, teach.

### `Quiz` · planned · input · phone
One to six questions shown one at a time, each with its answer area (options to tap, true or false, a blank
to type, or pairs to match); checking marks right in `good` or wrong in `bad`, shows the right answer and an
explanation, then moves to the next.
- Pick: questions with a right answer. Not a group vote (social `Poll`), not a choice with no right answer
  (`Choice`), not a card to recall (`Flashcard`).
- Writes: `questions` of `question` text(120), `kind` (`choice`, `truefalse`, `type`, `match`), `options`
  text(40) each, 2–5 (choice), `pairs` of left text(20), right text(20), 3–5 (match), `answer` (index, text
  or boolean), `explain` text(200) optional, `photo` optional, 1–6.
- Parts → actions: options `root select`, `field type`, pairs `left select` then `right select` (by index),
  `check press`, `next press`. · States: filled, success (right), error (wrong).
- Real path: questions stored with the app; checked on the device.
- Aliases: quiz, question, test, practice.

### `Flashcard` · planned · input · phone
A deck session: the front of the current card; a tap flips it to the answer, then "Again", "Hard", "Good"
and "Easy" schedule its next review; the cards left today show at the top.
- Pick: recalling something and rating how well. Not a question with options (`Quiz`), not keep-or-skip
  decisions (`SwipeStack`).
- Writes: `cards` of `front` text(80), `back` text(160), `hint` text(60) optional, `photo` optional,
  2–6 (seed cards; real decks come from records). Cards left and next review dates are computed.
- Parts → actions: `card flip`; after a flip, `again press`, `hard press`, `good press`, `easy press`
  (`actions.when` on the flipped state). · States: filled, empty (nothing due), success (done for today).
- Real path: cards and their review dates on the device. · Kit: `KitFlip`.
- Aliases: flashcard, recall, spacedrepetition, deck.

### `Path` · planned · data · phone
A winding path of units as round nodes: done ones filled, the current one large with a start button,
locked ones dim, a trophy at milestones.
- Pick: where the learner is in a course of units. Not steps of a short flow (`Steps`), not a list of units
  to scan (`List`).
- Writes: `units` of `title` text(24), `state` (`done`, `current`, `locked`), `icon`, `goto`, 3–12;
  `milestones` indexes optional.
- Parts → actions: items `root press` (done and current only). · States: filled, loading. · Dense.
- Real path: progress per unit stored on the device. · Aliases: path, coursemap, units, roadmap.

### `Result` · planned · data · phone
How a practice went: the score large, right and wrong counts, time taken, points earned, and the mistakes to
review.
- Pick: the outcome of a quiz or practice. Not saving something worked (`Success`), not a goal (`Ring`), not
  summary numbers (`Stats`), not a match score (sports `Scoreboard`).
- Writes: `right` number, `of` number, `seconds` optional, `points` number optional, `mistakes` of question
  text(60), answer text(40), 0–5.
- Parts → actions: `review press`, `again press`. · States: filled, success (perfect).
- Real path: results stored on the device. · Aliases: result, results, grade, mark.

### `Achievements` · planned · data · phone
Badges as a grid of round icons, earned ones in colour with the date, locked ones grey with what earns them.
- Pick: badges earned for milestones. Not a habit's days in a row (`Streak`), not pictures (`Gallery`), not
  kids' points (home `Rewards`).
- Writes: `badges` of `title` text(20), `icon`, `earned` date optional, `how` text(48) optional, 2–12.
- Parts → actions: items `root press`. · States: filled, empty. · Dense.
- Real path: milestones checked on the device. · Aliases: badges, achievements, trophies, awards.

### `Timetable` · planned · data · phone
The student's week of classes: periods by weekday with subject, room and teacher, today first and the
current period highlighted.
- Pick: a repeating weekly class schedule. Not one day's plan (`Timeline`), not staff shifts (team
  `Roster`), not bookable times (booking `Slots`), not a family's week (home `Agenda`).
- Writes: `days` of `day` (mon…sun), `periods` of `time` HH:MM, `subject` text(24), `room` text(12)
  optional, `tone` optional, 1–8, 1–7.
- Parts → actions: `day select`, periods `root press`. · States: filled, empty. · Dense.
- Real path: a timetable stored on the device. · Aliases: timetable, classschedule, periods.

### `Assignments` · planned · data · phone
Homework and coursework: subject colour, title, due date with "in 2 days" or overdue in `bad`, status (to
do, handed in, graded) and the grade.
- Pick: work to hand in with due dates and grades. Not jobs with no due date or grade (`Checklist`), not
  the result of one practice (`Result`).
- Writes: `items` of `title` text(28), `subject` text(20), `due` date, `status` (`todo`, `done`,
  `graded`), `grade` text(6) optional, `goto`, 1–6. "In 2 days" and overdue are computed.
- Parts → actions: items `done check`, items `root press`. · States: filled, empty.
- Real path: assignments stored on the device. · Aliases: homework, assignments, coursework, duework.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `course` | Where I am | `path`, `list` | Header, Streak, Path \| List, Button |
| `lesson` | Learn then practise | `teach`, `quiz`, `cards` | `teach`: Steps, Lesson · `quiz`: Steps, Quiz · `cards`: Header, Flashcard |
| `results` | How it went | `result`, `badges`, `class` | `result`: Result, Button · `badges`: Header, Achievements, List[ranked] · `class`: Header, People, Progress, List[ranked] |
| `planner` | My classes and homework | `week` | Header, Timetable, SectionTitle, Assignments |

## Worked example: Kanji Drop

Japanese kanji practice. The `course` path shows unit 4 of 12; a lesson teaches 水 with an example word; a
`Quiz` of five questions asks readings; `Flashcard` reviews the day's due cards; `Result` shows 9 of 10 with
one mistake; a 12-day `Streak` and `Achievements` keep it going. Signature: `streak_flame`.

## Aliases that shadow the core

With `learning`: `deck` → `Flashcard` (otherwise `SwipeStack`). No other alias here matches a core alias.

## Tiers

All `phone`. A teacher's `class` layout with real students needs other people; the default is self-study.

## Build notes

- Order: `Quiz`, `Lesson`, `Result`, `Flashcard`, `Path`, `Achievements`, `Timetable`, `Assignments`.
- `Quiz` never prints `answer` in a read line; an agent sees the options, then the result after `check`.
- Spaced review uses a fixed schedule in code (1, 3, 7, 14, 30 days); the model never writes dates.

## Open questions

- **Speaking exercises?** Default: wait for misses; listening uses `Player`.
