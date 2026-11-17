# `learning` pack

**Status:** revised · **Wave:** 3 · **Pick line:** Teaching and practising: lessons, quizzes, flashcards.
Not a team's training rota (`team`).

## Purpose

Learning something step by step and checking it stuck: lessons, questions with feedback, flashcards with
spaced review, a path through units, scores and badges, and the student's own week of classes and homework.

## Apps it serves

Language practice, exam revision, driving theory test, a teacher's class quizzes, kids' times tables,
student planner (timetable and homework), music theory drills, onboarding training for staff, flashcards for
anatomy or law.

## What the core already covers

- Progress through a course: `Ring`, `Progress`; a daily habit: `Streak`; a ranking: `List` style `ranked`.
- A lesson video or audio: `Player`; choosing among options with a sentence each: `Choice`.
- Units to scan: `List`; a timer for a test: `Timer`.

The first plan's `Leaderboard` (then in `social`) is core `List` style `ranked`.

## Components (8)

### `Lesson` · planned · content · phone
One lesson step: a short explanation with an optional picture, an example in a tinted box, and a continue
button, with the step count at the top.
- Pick: teaching one idea before practising it. Not an article to read (media `Article`), not a question
  (`Quiz`).
- Writes: `title` text(40), `text` text(400), `example` text(160) optional, `photo` optional, `step`,
  `of`.
- Parts → actions: `next press`. · States: filled.
- Real path: lesson content stored with the app. · Aliases: lesson, explanation, unit, teach.

### `Quiz` · planned · input · phone
One question with its answer area: options to tap, true or false, a blank to type, or pairs to match; after
answering it marks right in `good` or wrong in `bad`, shows the right answer and an explanation.
- Pick: a question with a right answer. Not a group vote (social `Poll`), not a choice with no right answer
  (`Choice`), not a card to recall (`Flashcard`).
- Writes: `question` text(120), `kind` (`choice`, `truefalse`, `type`, `match`), `options` text(40) each,
  2–5 (choice), `pairs` of left text(20), right text(20), 3–5 (match), `answer` (index, text or true/false),
  `explain` text(200) optional, `photo` optional.
- Parts → actions: options `root select`, `field type`, pairs `root select`, `check press`.
- States: filled, success (right), error (wrong). · Real path: questions stored with the app; the check is
  made on the device. · Aliases: quiz, question, test, exercise, multiplechoice.

### `Flashcard` · planned · input · phone
A card with a prompt on the front; a tap flips it to the answer, then "Again", "Hard", "Good" and "Easy"
schedule its next review; the cards left today show at the top.
- Pick: recalling something and rating how well. Not a question with options (`Quiz`), not keep-or-skip
  choices (`SwipeStack`).
- Writes: `front` text(80), `back` text(160), `hint` text(60) optional, `photo` optional, `left` number.
- Parts → actions: `card flip`, `again press`, `hard press`, `good press`, `easy press`.
- States: filled, empty (nothing due), success (done for today). · Real path: cards and their review dates on
  the device. · Kit: `KitFlip`. · Aliases: flashcard, card, recall, spacedrepetition, deck.

### `Path` · planned · data · phone
A winding path of units as round nodes: done ones filled, the current one large and pulsing with a start
button, locked ones dim, with a chest or trophy at milestones.
- Pick: where the learner is in a course of units. Not steps of a short flow (`Steps`), not a list of units
  to scan (`List`).
- Writes: `units` of `title` text(24), `state` (`done`, `current`, `locked`), `icon`, 3–12; `milestones`
  indexes optional.
- Parts → actions: items `root press` (done and current only). · States: filled, loading.
- Real path: progress per unit stored on the device. · Aliases: path, course map, units, journey, roadmap.

### `Score` · planned · data · phone
The result of a practice: the score large, right and wrong counts, time taken, points earned, and a review
of mistakes.
- Pick: how a quiz or practice went. Not a success after saving something (`Success`), not a match score
  between teams (sports `Scoreboard`).
- Writes: `right` number, `of` number, `seconds` optional, `points` number optional, `mistakes` of
  question text(60), answer text(40), 0–5.
- Parts → actions: `review press`, `again press`. · States: filled, success (perfect).
- Real path: results stored on the device. · Aliases: score, result, results, grade, mark.

### `Achievements` · planned · data · phone
Badges as a grid of round icons, earned ones in colour with the date, locked ones grey with what earns them.
- Pick: badges earned for milestones. Not a habit's days in a row (`Streak`), not pictures (`Gallery`).
- Writes: `badges` of `title` text(20), `icon`, `earned` date optional, `how` text(48) optional, 2–12.
- Parts → actions: items `root press`. · States: filled, empty.
- Real path: milestones checked on the device. · Aliases: badges, achievements, trophies, awards.

### `Timetable` · planned · data · phone
The student's week of classes: periods by weekday with subject, room and teacher, today first and the
current period highlighted.
- Pick: a repeating weekly class schedule. Not one day's plan (`Timeline`), not staff shifts (team
  `Roster`), not bookable times (booking `Slots`).
- Writes: `days` of `day` (mon…sun), `periods` of `time` HH:MM, `subject` text(24), `room` text(12)
  optional, `tone` optional, 1–8, 1–7.
- Parts → actions: `day select`, periods `root press`. · States: filled, empty.
- Real path: a timetable stored on the device. · Aliases: timetable, classschedule, classes, periods.

### `Assignments` · planned · data · phone
Homework and coursework: subject colour, title, due date with "in 2 days" or overdue in `bad`, status (to
do, handed in, graded) and the grade.
- Pick: work to hand in with due dates and grades. Not tasks to tick off with no due date or grade
  (`Checklist`), not results of one practice (`Score`).
- Writes: `items` of `title` text(32), `subject` text(20), `due` date, `status` (`todo`, `done`,
  `graded`), `grade` text(6) optional, `goto`, 1–8.
- Parts → actions: items `done check`, items `root press`. · States: filled, empty.
- Real path: assignments stored on the device. · Aliases: homework, assignments, coursework, duework.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `course` | Where I am | `path`, `list` | Header, Streak, Path \| List, Button |
| `lesson` | Learn then practise | `teach`, `quiz`, `cards` | `teach`: Steps, Lesson · `quiz`: Steps, Quiz, Button · `cards`: Header, Flashcard |
| `results` | How it went | `score`, `badges` | `score`: Score, Button · `badges`: Header, Achievements, List[ranked] |
| `planner` | My classes and homework | `week` | Header, Timetable, SectionTitle, Assignments |

## Worked example: Kanji Drop

Japanese kanji practice. The `course` path shows unit 4 of 12 current; a lesson teaches 水 with an example
word; a `Quiz` asks its reading; `Flashcard` reviews 18 due cards; `Score` shows 9 of 10 with one mistake;
a 12-day `Streak` and an `Achievements` grid keep it going. Signature: `streak_flame`.

## Aliases that shadow the core

With `learning`: `quiz`, `question`, `test` → `Quiz` (otherwise `Choice`); `flashcard`, `deck` →
`Flashcard` (otherwise `SwipeStack`); `badges` → `Achievements`; `timetable` → `Timetable` (otherwise
`Calendar`); `homework` → `Assignments` (otherwise `Checklist`).

## Tiers

All `phone`. A teacher sharing quizzes with a class would need other people; the default is self-study.

## Build notes

- Order: `Quiz`, `Lesson`, `Score`, `Flashcard`, `Path`, `Achievements`, `Timetable`, `Assignments`.
- `Quiz` never prints the `answer` in a read line; an agent sees options and the result after `check`.
- Spaced review uses a fixed simple schedule in code (1, 3, 7, 14, 30 days); the model never writes dates.

## Open questions

- **Speaking and listening exercises?** Default: `Player` for listening; speaking waits for misses.
