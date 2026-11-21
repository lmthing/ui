# `puzzles` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Solo daily word, logic-grid, tile-matching and lifeline trivia games with guess histograms. Not group tabletop party tools (`play`), not school courses (`learning`).

## Purpose

Solo daily word, logic, tile-matching and trivia games played on one phone: five-letter guess grids, mini crosswords, word searches, Sudoku/Nonogram/Minesweeper logic boards, memory pair flips and 4-word category groups, constrained QWERTY/anagram keyboards, solo lifeline trivia and spoiler-free guess histograms. Built for individual daily puzzles rather than around-the-table group scorekeepers or graded school exams.

## Apps it serves

Daily word-guess game, mini crossword and word-search book, Sudoku and nonogram logic puzzle app, 16-tile category grouping game, anagram hive word builder, solo lifeline trivia game.

## What the core already covers

- Solve timer or round countdown: `Timer[up]` and `Timer[down]`.
- Consecutive-day play streak and week dots: `Streak`; friend daily solve rankings: `List[ranked]`.
- Puzzle rules or daily archive calendar: `Note`, `List[expand]`, `Calendar[month]`.
- Plain 4-option selection without lifelines or combo scoring: `Choice`.

Separate `DailyArchive` and `HintSheet` components are dropped: past daily puzzles browse via `Calendar[month]` or `List`, and hint triggers live inside each puzzle board. `WordGrid` earns its place for `4×4`–`9×9` letter matrices (`guess`, `crossword`, `search`) via `KitCellGrid`; `NumberGrid` covers `4×4`, `6×6` and `9×9` Sudoku/Nonogram/Minesweeper grids with pencil notes and conflict checks via `KitCellGrid`; `TileMatch` draws `3×4` or `4×4` flip-pair and 4-group boards; `LetterBank` provides state-tinted QWERTY and anagram/hive keyboards (`KitLetterKeys`); `QuizShow` runs solo trivia with `50:50` and `Hint` lifelines; and `PuzzleStats` renders 1–6 guess histograms and copies spoiler-free emoji grids (`copy` action).

## Components (6)

### `WordGrid` · planned · input · phone
Interactive `4×4` to `9×9` letter grid in three puzzle styles: `guess` (row-by-row color-evaluated tiles for exact, misplaced and absent letters), `crossword` (numbered clue squares paired with an active clue banner and Across/Down toggle), or `search` (selectable letter grid with found-word highlights).
- Pick: playing letter-guessing, mini crossword or word-search grids. Not digit/logic puzzles (`NumberGrid`), multi-line prose (`Composer`), or spreadsheets (data `Table`).
- Writes: `cols` integer 4–9, `rows` integer 4–9, `style`; (`guess`): `targetWord` text(9), `maxGuesses` integer 4–9 (default 6), `guesses` text(9) each 0–9; (`crossword`): `cells` of `row` integer 0–8, `col` integer 0–8, `blocked` boolean (default false), `number` integer 1–99 optional, `solution` text(1) optional, 16–81, `clues` of `number` integer 1–99, `dir` (`across`, `down`), `text` text(80), 2–24; (`search`): `letters` text(81), `words` text(12) each 3–12. Tile evaluation tones, solved status and remaining guesses are computed; solutions stay hidden from accessibility reads until solved.
- Styles: `guess` (default, Wordle-style row-evaluated tiles), `crossword` (numbered squares with clue bar), `search` (tappable word-search matrix).
- Parts → actions: cells `root select`, cells `letter set` (A–Z in `guess` or `crossword`), `direction toggle` (crossword), `hint press`, `check press`, `reset press`. `meta.confirmParts: ["reset"]`.
- States: filled, empty, loading, success (puzzle solved), error (not in word list or incomplete row).
- Real path: evaluates guesses and crossword/search hits deterministically on the phone from stored daily puzzle seeds via `KitCellGrid`.
- Density: `meta.dense: true`, weight 3; `4×4` to `9×9` interactive letter cell matrix.

### `NumberGrid` · planned · input · phone
Interactive `4×4`, `6×6` or `9×9` logic grid with locked given numbers or clues, selected cell/row/box highlights, a `1–9` digit or mark selector, a pencil-note mode toggle for candidate marks and live conflict tinting across colliding rows, columns or sub-grids.
- Pick: playing Sudoku, Nonogram or Minesweeper cell-logic grids. Not letter grids (`WordGrid`), tabletop game scores (play `ScoreSheet`), or record tables (data `Table`).
- Writes: `size` (`4`, `6`, `9`), `kind` (`sudoku`, `nonogram`, `minesweeper`), `givens` of `row` integer 0–8, `col` integer 0–8, `value` integer 0–9, 0–81; `rowHints` text(24) each 0–9 (nonogram only), `colHints` text(24) each 0–9 (nonogram only), `style`. Placed digits, pencil candidates, rule conflicts and completion status are runtime state; locked givens cannot be overwritten.
- Styles: `sudoku` (default, sub-grid borders and candidate pencil marks), `clues` (outer row/column hint bars for nonograms or mine counts).
- Parts → actions: cells `root select`, keys `digit set` (1–9 or mark), `pencil toggle`, `erase press`, `hint press`, `reset press`. `meta.confirmParts: ["reset"]`.
- States: filled, empty, loading, success (grid solved without conflicts), error (rule conflict detected).
- Real path: validates row, column and sub-grid constraints locally on the device using `KitCellGrid` and persists in-progress pencil marks.
- Density: `meta.dense: true`, weight 3; up to 81 interactive logic cells with pencil notes and conflict states.

### `TileMatch` · planned · input · phone
Interactive `3×4` or `4×4` tile board in `memory` mode (tap to flip two face-down cards and match identical pairs) or `groups` mode (select four related words and submit to lock them into a color-coded category bar, tracked by remaining mistake pips).
- Pick: matching face-down pairs or grouping 16 words into four hidden categories. Not spaced-repetition study cards (learning `Flashcard`), swipe stacks (`SwipeStack`), or party trivia (play `Trivia`).
- Writes: `style`; (`memory`): `pairs` of `id` text(24), `label` text(24), `photo` optional, 6–8; (`groups`): `groups` of `category` text(40), `tier` (`yellow`, `green`, `blue`, `purple`), `words` text(20) each exactly 4, exactly 4; `maxMistakes` integer 1–6 (default 4). Shuffled positions, flipped cards, locked category banners and mistake counts are runtime state; hidden `groups` categories never reach accessibility reads until solved or out of mistakes.
- Styles: `memory` (default, 3×4 or 4×4 flip-pair cards), `groups` (4×4 category word grouping with mistake pips).
- Parts → actions: tiles `root flip` (memory mode), tiles `root toggle` (groups selection), `submit press` (groups mode), `shuffle press`, `deselect press`, `reset press`. `meta.confirmParts: ["reset"]`.
- States: filled, empty, loading, success (all pairs or groups solved), error (mismatch shake or out of mistakes).
- Real path: shuffles seeds and evaluates pair or category matches locally on the phone using existing `KitFlip` and `KitTile` bases.
- Density: `meta.dense: true`, weight 3; `3×4` or `4×4` tile grid with mistake pips and solved bars.

### `LetterBank` · planned · input · phone
On-screen constrained letter selector in `keyboard` mode (QWERTY layout with keys tinted by solved, present or absent states plus Submit and Backspace) or `anagram` mode (4–8 circular or honeycomb letter tiles with an optional required center letter, shuffle, delete and submit). Can drive a companion `WordGrid` on the same screen.
- Pick: typing into word puzzles with letter-state tinting or building words from constrained anagram/hive tiles. Not form inputs (`Field`) or currency pads (money `AmountPad`).
- Writes: `style`; (`keyboard`): `states` of `letter` text(1), `tone` (`unused`, `absent`, `present`, `correct`), 0–26 (computed automatically when paired with `WordGrid`); (`anagram`): `letters` text(1) each 4–8, `centerIndex` integer 0–7 optional, `foundWords` text(16) each 0–24, `validWords` text(16) each 1–40 optional; `drivesGrid` boolean (default true when paired with `WordGrid`). When paired with `WordGrid`, `meta.drives: "WordGrid"` forwards key presses, backspace and submit into the active grid.
- Styles: `keyboard` (default, state-tinted QWERTY keys), `anagram` (circular or honeycomb letter wheel with shuffle).
- Parts → actions: keys `root press`, `backspace press`, `shuffle press` (anagram), `submit press`.
- States: filled, loading, success (word accepted), error (invalid or already found word).
- Real path: handles letter selection and word-list validation locally on the phone via `KitLetterKeys`, driving `WordGrid` when present on screen.

### `QuizShow` · planned · input · phone
Solo four-option trivia game with category pill, combo/score meter, optional `50:50` (removes two wrong options) and `Hint` lifelines, immediate right/wrong reveal on choice, factoid explanation note and Next Question button.
- Pick: self-paced single-player trivia with lifelines, combo scores and factoid reveals. Not host-led group trivia without grading (play `Trivia`), school exams (learning `Quiz`), or group polls (social `Poll`).
- Writes: `questions` of `questionId` text(32), `category` text(24), `question` text(160), `options` text(60) each exactly 4, `correctIndex` integer 0–3, `hint` text(100) optional, `factoid` text(180) optional, `points` integer 10–1000 (default 100), 1–10; `lifelines` (`fifty_fifty`, `hint`) optional, `style`. Current score, combo multiplier, eliminated options and reveal state are runtime state; `correctIndex` never leaks into reads before an option is selected.
- Styles: `show` (default, category badge, combo meter, lifelines and four choices), `compact` (tighter question card without combo meter).
- Parts → actions: options `root select`, `fiftyFifty press`, `hint press`, `next press`, `restart press`. `meta.confirmParts: ["restart"]`.
- States: filled, empty, loading, success (correct answer or round finished), error (wrong answer revealed).
- Real path: scores answers, lifelines and combo multipliers locally from a stored or downloaded trivia deck.

### `PuzzleStats` · planned · data · phone
Daily puzzle statistics summary showing games played, win percentage, current streak, best streak, a 1–6 guess distribution bar histogram (highlighting today's score row) and a Share Result button that copies a spoiler-free emoji grid to the clipboard.
- Pick: summarizing daily puzzle streaks, guess histograms and copying spoiler-free emoji share grids. Not graded course summaries (learning `Result`), generic habit trackers (`Streak`), or general metrics (`Stats`).
- Writes: `puzzleName` text(24), `played` integer ≥ 0, `won` integer ≥ 0, `currentStreak` integer ≥ 0, `maxStreak` integer ≥ 0, `distribution` exactly 6 integers ≥ 0 (guesses 1–6), `todayGuesses` integer 1–6 optional, `shareGrid` text(160) optional, `style`. Win percentage and bar ratios compute from `played`, `won` and `distribution`.
- Styles: `summary` (default, KPIs, 1–6 guess histogram and spoiler-free copy), `compact` (streak metrics and copy action only).
- Parts → actions: `share copy` (copies `shareGrid` to clipboard), `archive press` (if linked).
- States: filled, empty (no puzzles finished yet), loading.
- Real path: aggregates locally saved puzzle outcomes on the device and writes spoiler-free share grids via the phone's clipboard.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `daily_puzzle` | Play daily word, logic and tile puzzles and view stats | `puzzles_word`, `puzzles_number`, `puzzles_match`, `puzzles_summary` | `puzzles_word`: Header, WordGrid[guess], LetterBank[keyboard], Note · `puzzles_number`: Header, Timer[up], NumberGrid[sudoku], Note · `puzzles_match`: Header, TileMatch[groups], Note, Button · `puzzles_summary`: Header, PuzzleStats, Streak, Button |
| `crossword_book` | Solve mini crosswords, anagrams and word searches | `puzzles_grid`, `puzzles_anagram`, `puzzles_search` | `puzzles_grid`: Header[back], Timer[up], WordGrid[crossword], LetterBank[keyboard] · `puzzles_anagram`: Header[back], Progress, LetterBank[anagram], Chips, Note · `puzzles_search`: Header[back], WordGrid[search], Note, Button |
| `trivia_game` | Play solo lifeline trivia and review archive | `puzzles_play`, `puzzles_stats` | `puzzles_play`: Header, Timer[down], QuizShow, Note · `puzzles_stats`: Header, PuzzleStats[compact], Calendar[month], Note |

The first listed layout is each `defaultLayout`; all layout ids are `puzzles_`-prefixed and unique. Recipes use only core plus `puzzles`, keep every screen at 4–5 components, total weight at most 8, and at most one heavy/dense component per screen.

## Worked example: DailyBrain

A solo daily puzzle suite, distinct from Ledge and Trot. `daily_puzzle/puzzles_word` pairs a `5×6` `WordGrid[guess]` with `LetterBank[keyboard]`; entering `"CRANE"` and `"SLATE"` tints eliminated letters on `LetterBank` and highlights exact matches in the grid. Solving in 3 guesses updates `daily_puzzle/puzzles_summary`, where `PuzzleStats` computes an 88% win rate across 42 games, highlights the 3-guess bar, and copies a spoiler-free emoji grid with `share copy`, while `Streak` animates a 9-day streak (`streak_flame`, the app's single signature).

`daily_puzzle/puzzles_number` runs a `9×9` `NumberGrid[sudoku]` with pencil candidates; `puzzles_match` runs a 16-word `TileMatch[groups]` with four mistake pips; `crossword_book/puzzles_anagram` tracks 14 found words against a 25-word target on `Progress`; and `trivia_game/puzzles_play` runs a 30-second-per-question `QuizShow` with `50:50` and `Hint` lifelines.

## Tiers

All six components run locally on the phone (`phone`) using deterministic puzzle evaluation and local solve history. Downloading new daily puzzle packs or syncing friend leaderboards uses an optional catalog service (`service`) or shared app (`people`) at app level, without blocking offline play.

## Build notes

- Order: `WordGrid`, `LetterBank`, `NumberGrid`, `TileMatch`, `PuzzleStats`, `QuizShow`; all remain planned.
- New kit bases: `WordGrid` and `NumberGrid` share the new `KitCellGrid` base, and `LetterBank` requires `KitLetterKeys`. `TileMatch` reuses existing `KitFlip` and `KitTile` bases; `QuizShow` and `PuzzleStats` compose existing kit bases (`KitCard`, `KitOption`, `KitMeter`, `KitGrid`, `KitTrack`, `KitChip`, `KitText`, `KitAction`).
- `WordGrid`, `NumberGrid` and `TileMatch` are `dense` (`weight 3`); `LetterBank`, `QuizShow` and `PuzzleStats` are weight 2.
- Writers use strict `writerFormat(registry)` for core plus `puzzles`; no aliases or off-pack fallbacks. Never leak hidden `WordGrid.targetWord`, `WordGrid` crossword `solution`, `TileMatch` `groups` categories or `QuizShow.correctIndex` into accessibility reads before resolution.
- `LetterBank` declares `meta.drives: "WordGrid"` so paired screens forward key presses, backspace and submit cleanly without custom screen glue.
- Each component later ships two domain examples, choose/write/read probes and declared part/state tests, plus a three-preset `example.jsonl`.

## Open questions

- **Friend result leaderboards?** Default: combine `puzzles` with `social` (`List[ranked]`, `Feed`) at app level; spoiler-free `PuzzleStats` copy handles link/text sharing natively.
- **Pencil-note storage for Sudoku vs Minesweeper flags?** Default: both live inside runtime cell-annotation state on `NumberGrid` (`KitCellGrid`), toggled via `pencil toggle`.
- **New action names?** None. Grid cells and options use `select`, digits use `set`, flip-memory cards use `flip`, group tiles and modes use `toggle`, buttons use `press`, and spoiler-free sharing uses `copy` (already in the core `ActionName` vocabulary).
