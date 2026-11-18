# `play` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Playing a game together: round scores,
dice, a spinner, turns, host-led trivia and random teams. Not league fixtures and standings (`sports`),
not graded practice (`learning`), not household duties (`home`).

## Purpose

Tools for playing around one phone: keep a board game's round scores, roll dice, spin for a random
choice, take turns, reveal a trivia answer and split the players into teams. It supports the game at the
table, not a general game engine, a sports season or a course. No wagers, prizes for money or payments.

## Apps it serves

Party games, board-game score keeper, pub-quiz host for one evening, family game night, tabletop dice
roller, classroom icebreaker without grading, a random challenge wheel.

## What the core already covers

- One running score: `Counter`; a few summary numbers: `Stats`; final ranking: `List[ranked]`.
- A turn or question clock: `Timer`; instructions: `Note`, `Card` or `List[expand]`.
- Choosing a game: `List[cards]`; choosing ordinary options or an answer privately: `Choice`, `Chips`.
- Game photos or a picture clue: `Photo`, `Gallery`; typing a guess: `Field`; saving worked: `Success`.
- Setting names and rules: `Field`s; game-night preparation: `Checklist`, `Calendar`, `Timeline`.

Separate game library, leaderboard, countdown, rules card and simple answer picker components are
dropped. `ScoreSheet` stays for numeric round cells and computed totals; `Dice`, `Spinner` and
`TeamPicker` perform random draws, not ordinary selections. `Trivia` owns a host's question/reveal
sequence without grading submissions. `TurnOrder` owns game laps, skips and direction, not a job rota.

## Components (6)

### `ScoreSheet` · planned · input · phone
A score matrix with players down the side, rounds across, editable cells and a computed total per player.
The selected round stays visible beside the sticky player column; a completed game marks every tied winner.
- Pick: record several players' scores round by round. Not one running number (`Counter`), a final
  ranking (`List[ranked]`), a live two-sided match (sports `Scoreboard`) or arbitrary records (data `Table`).
- Writes: `players` of `name` text(24), 2–6; `rounds` of `label` text(16), `points` of signed integers
  −999–999 or null (unplayed), exactly one per player, 1–12; `wins` (`high` default, `low`);
  `share` boolean (default false); `style`. Totals, completed rounds, ranks and winners are computed.
- Styles: `grid` (default), `round` (one selected round's cells and totals, with round navigation).
- Parts → actions: round headers `root select`, cells `score set` (integer), `reset press`,
  `share press` (when enabled). `meta.confirmParts: ["reset"]`; `meta.partTiers: { share: "people" }`.
- States: filled, empty (no scores entered), loading, success (all cells played).
- Real path: round scores saved on the device; share publishes a versioned score snapshot to a shared app.
- Density: `meta.dense: true`, weight 3; player names text(24), round labels text(16), at most 72 cells.

### `Dice` · planned · action · phone
One to six dice with their rolled faces and computed sum. Tap roll again, or hold individual dice so
only the others reroll; dice not rolled yet show no invented result.
- Pick: roll numbered dice and optionally hold some. Not counting manually (`Counter`), picking named
  options (`Spinner`) or a loading indicator (the kit's loading state).
- Writes: `count` 1–6 (default 2), `sides` one of 4, 6 (default), 8, 10, 12, 20 (numbers); `style`.
  Faces, held flags and sum are runtime state, never Writer props.
- Styles: `pips` (default; six-sided dice only), `numbers` (required for other side counts).
- Parts → actions: `roll press`, dice `hold toggle` (after rolling); roll disabled while all are held
  or a roll is in progress.
- States: empty (before first roll), filled, loading (rolling), success (result).
- Real path: unbiased random faces generated and saved on the device before the reveal animation.

### `Spinner` · planned · action · phone
A wheel of labelled options with a pointer and a spin control. Each spin selects one equal-sized sector
and names the result below; the result stays readable without watching the motion.
- Pick: pick one named option at random. Not choosing deliberately (`Choice`, `Chips`), rolling numbered
  dice (`Dice`), dividing everyone into groups (`TeamPicker`) or collecting votes (social `Poll`).
- Writes: `options` of `label` text(24), 2–6, distinct labels; `repeat` boolean (default true); `style`.
  The selected index, used options and remaining count are computed from stored draws.
- Styles: `wheel` (default), `strip` (a sliding rail of the same options).
- Parts → actions: `spin press` (disabled while spinning or no options remain), `reset press` (only
  without repeats; restores eligibility). `meta.confirmParts: ["reset"]`.
- States: empty (before first draw), filled, loading (spinning), success (result or pool exhausted).
- Real path: equal-probability draws stored on the device; without repeats each option is used once.

### `Trivia` · planned · content · phone
A host reads one question at a time while players answer aloud or on paper. Reveal shows the answer
and an optional explanation, then next opens the following question; it never grades a submission.
- Pick: host a question-and-reveal game at the table. Not graded questions with submitted answers
  (learning `Quiz`), private choices (`Choice`) or recall with spaced review (learning `Flashcard`).
- Writes: `questions` of `question` text(120), `answer` text(120), `explain` text(160) optional,
  `photo` optional, `points` integer 1–20 (default 1), 1–6; `style`. Current question and reveal state
  come from the session; no submitted answers, correct flags, grades or computed scores are written.
- Styles: `card` (default), `large` (larger question for a host showing the phone).
- Parts → actions: `reveal press` (before reveal), `next press` (after reveal, except the last),
  `restart press`. `meta.confirmParts: ["restart"]`; restarting hides answers but preserves score records.
- States: filled (question), loading, success (revealed; last question complete), empty (no local deck).
- Real path: a local question deck and host-controlled reveals; the host records awarded points separately.

### `TurnOrder` · planned · data · phone
The current player large, the next players in order and the lap number, with next, skip and reverse.
A bounded game ends after its final lap; an open-ended game keeps rotating.
- Pick: track game turns, laps and play direction. Not rotating a household job (home `Turns`), a
  schedule (`Timeline`) or people listed without a turn cursor (`People`).
- Writes: `players` of `name` text(24), `photo` optional, 2–6; `first` player index (default 0);
  `direction` (`forward` default, `reverse`); `laps` integer 1–12 optional; `style`.
  Current player, lap, completed turns and skips follow from stored turn events, never separate props.
- Styles: `ring` (default), `queue` (current player followed by the rest).
- Parts → actions: `next press`, `skip press` (each consumes one turn), `reverse press` (changes the
  following order, not the current player), `restart press`. `meta.confirmParts: ["restart"]`.
- States: filled, loading, success (last lap complete).
- Real path: an ordered roster and turn events on one device; names need no accounts or remote replies.

### `TeamPicker` · planned · input · phone
Players split randomly into two to four named teams, with team sizes differing by at most one.
Optional locked placements keep specified players together; a redraw confirms before replacing the grouping.
- Pick: divide all players into balanced random teams. Not selecting one option (`Spinner`), manually
  selecting people (`Choice[multi]`) or sports availability and positions (sports `Squad`, `Lineup`).
- Writes: `players` of `name` text(24), `photo` optional, `team` index optional (locked placement),
  2–12; `teams` of `label` text(16), 2–4, no more teams than players, distinct labels; `style`.
  Unlocked assignments, sizes and feasibility are computed; impossible locks show an error, not uneven teams.
- Styles: `columns` (default; scrolls sideways), `groups` (team headings with player rows).
- Parts → actions: `make press` (before grouping), `remake press` (after grouping).
  `meta.confirmParts: ["remake"]`; locked placements are edited on the core setup form.
- States: empty (not grouped yet), filled, loading, success (grouped), error (infeasible locks).
- Real path: a roster, locked placements and a random balanced allocation saved on the device.
- Density: `meta.dense: true`, weight 3; at most 12 players, at most 6 visible rows per team.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `game_night` | Set up and play together | `play_teams`, `play_turns`, `play_chance` | `play_teams`: Header, TeamPicker, Note, Button · `play_turns`: Header, TurnOrder, Card, Button · `play_chance`: Header, Dice, SectionTitle, Spinner, Note |
| `score_round` | Enter rounds and see the result | `play_scores`, `play_results` | `play_scores`: Header, ScoreSheet, Note · `play_results`: Header, List[ranked], Note, Button |
| `trivia_round` | Host a question, reveal and score it | `play_question`, `play_awards` | `play_question`: Header, Timer[down], Trivia, Note · `play_awards`: Header, ScoreSheet[round], Note, Button |

Defaults: `game_night/play_teams`, `score_round/play_scores`, `trivia_round/play_question`. Layout ids
are play-prefixed and unique in the archetype/layout namespace. Recipes use only core plus `play`;
the ranked result and round entry read the same score record, not independently seeded totals.

## Worked example: Table Night

A family's six-player game night. Neither Ledge's care nor Trot's bookings needs games, so this is a
small standalone app. `game_night/play_teams` makes three teams of two; the three team labels become
the scoring and turn roster. `play_turns` advances one turn per team through two laps. `play_chance`
rolls two six-sided dice and spins among six challenge categories, with repeats allowed.

For a six-question pub-quiz take, `trivia_round/play_question` gives the host a 30-second clock and
hides the answer until reveal. After each answer the host awards integer points on `play_awards`;
`score_round/play_results` orders the computed totals, preserving ties. Across the app the only
signature is core `timer_spin` on the question clock; chance controls keep ordinary feedback motion.

## Tiers

All six main uses are `phone`: one host can enter names and play with people physically present.
Only `ScoreSheet.share` is `people`, reads `!needs-people` and requires a shared app; it is off by
default. Camera clues use core `Camera` (`ok`), not a hidden permission in `Trivia`. No service is
required; remote answer collection, live multi-phone control and paid chance games are not promised.

## Build notes

- Order: `ScoreSheet`, `Dice`, `Spinner`, `TurnOrder`, `TeamPicker`, `Trivia`. This task plans only;
  no metadata, schemas, renderers, archetype files or JSON Lines example are built.
- Writers use strict `writerFormat(registry)`: core plus the Director's selected packs only, no aliases
  or off-pack fallbacks. Every component is body-region, weight 2 unless explicitly dense/weight 3.
- Seed raw round scores and question content, not totals, ranks, random outcomes or progress. Reads omit
  `Trivia.answer` and `explain` until reveal, including accessibility text; local hiding is not anti-cheat.
- Randomness uses device entropy and rejection sampling, not model guesses or rounded random numbers.
  Record an outcome once per accepted press; interrupted animations and reopening never draw again.
- Balance teams by choosing uniformly among feasible extra-place assignments, then uniformly
  shuffling unlocked players into the remaining places. Never choose sizes or teams with model output.
- Kit bases only: reuse planned shared `KitTable` for scores; dice faces, wheel/strip and turn ring
  need themed base designs before implementation, never bespoke drawing inside component files.
- Every component later needs two domain examples, choose/write/read probes and declared state/part
  tests; the worked `example.jsonl` must validate and render in three presets. Use shared neutral
  fallbacks and copy helpers, tokens only, keyboard controls and reduced-motion result reveals.
- Keep each recipe within 3–9 components, weight 12 and two heavy components. Reset/restart/remake
  parts use standard confirmation; runtime `confirmParts` dispatch is still pending in the shared kit.

## Open questions

- **New action names?** None. Roll, spin, reveal, next, grouping and sharing use `press`; scores use
  `set`, held dice use `toggle`, round navigation uses `select`.
- **Chance signature?** Proposal: one new `dice_roll` signature on `Dice`, subject to a reference mock
  and acceptance before registration. Do not also add a spinner signature; until then use a core moment.
- **Long score sheets or quiz decks?** Default: at most 6 scoring sides and 12 rounds, 6 seed questions;
  larger local decks supply one bounded page at a time. Team setup allows 12 names, then scores teams.
- **Custom game rules, unequal teams or graded answers?** Default: out of scope. Simple counters and
  choices stay core; league fixtures/tables load `sports`, marked exercises load `learning`, chores load
  `home`. Combining packs is optional at app level, never a dependency of `play`.
