# `sports` pack

**Status:** new · **Wave:** 5 · **Pick line:** A sports team or league: fixtures, scores, standings,
lineups, availability. Not a workout (`health`), not a staff rota (`team`).

## Purpose

Amateur and grassroots sport, run by volunteers: the next match and who is available, the lineup, keeping
the score live, what happened in the match, the league table and a knockout cup. It works for any sport
with sides, scores and fixtures; football is the default for positions and periods.

## Apps it serves

Sunday league or five-a-side team, kids' club (with `home` for parents' duties), netball or hockey club,
school sports day, pub quiz league, darts or pool league, office tournament, padel or tennis ladder (with
`List` style `ranked`).

## What the core already covers

- A ladder or top scorers: `List` style `ranked`; the team: `People`; one player: `Profile` with `Stats`.
- Training sessions: `Timeline` or `Calendar`; the season's results by month: `Bars`.
- A match clock: `Timer`; club news: `Card`, `Banner`; chat: `Bubbles` with `Composer` style `reply`.

The draft `ScoreEntry` is a style of `Scoreboard`, and `PlayerCard` is `Profile` with `Stats`.

## Components (10)

### `Fixtures` · planned · data · phone
Matches in date order: date and time, the opponent with a round initial badge, home or away, the venue, and
for played ones the score with a win, draw or loss pill; or the next match alone as a large card with meet
time and kit.
- Pick: the team's matches, coming and played. Not one match live (`Scoreboard`), not an appointment
  (booking `Appointment`), not a community event (social `EventCard`).
- Writes: `matches` of `date`, `time` HH:MM, `opponent` text(24), `home` boolean, `venue` text(28)
  optional, `us` number optional, `them` number optional, `meet` HH:MM optional, `kit` text(16) optional,
  `goto`, `live` boolean optional, `clock` text(12) optional, 1–6; `style`. Results pills are computed
  from the scores and not shown for live fixtures. The clock is game time, not kickoff time.
- Styles: `list` (default), `next` (the first match as a large card), `scoreboard` (all matches in a score ticker).
  Axes: density `comfortable`, `compact`; detail `full`, `brief` (hides venue, meet and kit).
- Parts → actions: `root`, `message`; items `root press`, `date`, `time`, `opponent`, `badge`, `side`,
  `venue`, `score`, `result`, `meet`, `kit`, `live`, `clock`. · States: filled, empty, loading.
- Real path: fixtures entered on the captain's phone; teammates following them is `people` (`partTiers`).

### `Scoreboard` · planned · data · phone
Two sides with large scores, the period and clock between them, and the status (not started, live, half
time, full time); in `keeper` style each side has plus and minus buttons for the person keeping score.
- Pick: the score of one match now. Not a practice result (learning `Result`), not a count of one thing
  (`Counter`).
- Writes: `home` text(20), `away` text(20), `homeScore` number, `awayScore` number, `period` text(12)
  optional, `status` (`upcoming`, `live`, `break`, `final`), `style`, `sport` (`football`, `basketball`,
  `baseball`, `tennis`, `hockey`, `generic`) optional; `periods` of `label` text(12), `home` and `away`
  nonnegative integers, 1–12, optional; `possession` (`home`, `away`) optional. For baseball or softball
  set `sport` to `baseball`; optional `outs` integer 0–2, `balls` integer 0–3, `strikes` integer 0–2,
  and `bases` of `first`, `second`, `third`, 0–3 unique values. An empty bases array means no runners.
  Baseball and softball omit the elapsed clock in display style.
- Styles: `display` (default), `keeper`. Axes: density `comfortable`, `compact`; emphasis `normal`, `quiet`;
  detail `full`, `brief` (hides period). · Parts → actions: `root`, `scores`, `home increment`,
  `home decrement`, `away increment`, `away decrement`, `home_score`, `away_score`, `clock start`,
  `clock stop`, `clock_icon`, `clock_value`, `period`, `status`, `sport`, `periods`, `possession`,
  `outs`, `balls`, `strikes`, `bases` (actions only in keeper). · States: filled, loading.
- The host keeps one match record: a keeper's increment adds a goal to it, and `Scoreboard` and
  `MatchFeed` both read it, so seeded scores must equal seeded goals (a screen check). · Kit: `KitScore`.
- Real path: the score kept on one phone; following it live elsewhere is `people` (`partTiers`).

### `Standings` · planned · data · phone
A league table: position, team, played, won, drawn, lost, goal difference, points and recent form as five
pills; the person's team tinted; promotion and relegation places marked by a line.
- Pick: a league table of teams with several columns. Not a ranking by one value (`List` style `ranked`),
  not a general table of records (data `Table`).
- Writes: `rows` of `team` text(20), `won`, `drawn`, `lost`, `for`, `against` numbers, `form` (`w`, `d`,
  `l`) each 0–5 (seed: the last five results), 2–20; `mine` index 0–19 optional; `lines` of one-based
  cut positions 1–19, 0–2 (default empty); `scoring` of `win` and `draw` integers 0–99 (defaults 3
  and 1); `group` text(16) optional, `format` (`football_pts`, `pct_gb`) optional. The default points
  table computes played, points, difference and order. `pct_gb` ranks by win percentage (a tie is
  half a win) and shows games behind the leader instead of goal difference and points. · Dense.
- Axes: density `comfortable`, `compact`; detail `full`, `brief` (hides form).
- Parts → actions: `root`, `title`, `group`, `hint`, `table`; rows `root press`, `position`, `team`,
  `played`, `won`, `drawn`, `lost`, `difference`, `points`, `form`, `percentage`, `games_behind`.
  · States: filled, loading. · Kit: `KitTable`.
- Real path: results entered on the organiser's phone; a league shared across clubs is `people`.

### `Lineup` · planned · data · phone
The starting players on a drawn pitch in their lines (keeper, defence, midfield, attack), each as a numbered
circle with a surname, and the substitutes in a row below; or as a plain list by position.
- Pick: who plays where in one match. Not who is available (`Squad`), not a staff rota (team `Roster`).
- Writes: `lines` of `players` of `number` integer 0–99, `name` text(16), 1–6, 1–5 (from the back);
  `subs` of the same player fields, 0–7 (default empty); `style`. In `list`, each player can also have
  `rating` number 0–10, `cards` of `yellow` or `red`, 1–3, and `goals` integer 0–99, all optional.
- Styles: `pitch` (default), `list`. Axes: density `comfortable`, `compact`; surface `card`, `outlined`;
  detail `full`, `brief` (hides shape). · Parts → actions: `root`, `title`, `shape`, `formation`, `bench`,
  `bench_list`; players `root press`, `number`, `name`, `rating`, `cards`, `goals`. · States: filled, empty.
- Real path: the coach's selection in a shared app.

### `MatchFeed` · planned · data · phone
What happened in a match by the minute: goals, cards, substitutions and notes, each on the side of the team
it belongs to, the newest first while live.
- Pick: events within one match, on two sides. Not a history in time order on one side (`Timeline` style
  `history`), not a day's plan (`Timeline`), not posts in a community (social `Feed`).
- Writes: `events` of `minute` 0–130, `side` (`home`, `away`), `kind` (`goal`, `card_yellow`, `card_red`,
  `sub`, `note`), `text` text(36), 1–12. · Dense.
- Parts → actions: `add press` (opens the screen's `Sheet` picker of event kinds; adds to the match
  record). · States: filled, empty. · Real path: events added on the scorekeeper's phone; following them is
  `people`.

### `Squad` · planned · input · people
Who is available for the next match: each player with yes, maybe or no and a reason, the count of yes
against the number needed, and for the coach a tick to select them.
- Pick: players' availability and selection for one match. Not guests' replies (events `GuestList`), not
  staff shifts (team `Roster`).
- Writes: `needed` number, `players` of `name` text(20), `photo`, `answer` (`yes`, `maybe`, `no`,
  `none`), `reason` text(24) optional, `picked` boolean, 1–20; `coach` boolean. Counts are computed. · Dense.
- Parts → actions: own row `answer select`, players `picked check` (coach). · States: filled, empty.
- Real path: answers collected in a shared app.

### `Bracket` · planned · data · phone
A knockout cup as rounds side by side (quarter-finals, semis, final): each tie with two names and scores,
winners carried to the next round, the person's team highlighted.
- Pick: a knockout tournament. Not a league table (`Standings`), not a list of matches (`Fixtures`).
- Writes: `rounds` of `label` text(16), `ties` of `a` text(16), `b` text(16), `aScore` and `bScore`
  numbers optional, 1–8, 1–4; `mine` text(16) optional. Winners are computed from the scores. · Dense.
- Parts → actions: ties `root press`. · States: filled, loading.
- Real path: results entered on the organiser's phone; following them is `people`.

### `MatchStats` · planned · data · phone
A side-by-side statistical comparison of two teams in one match, drawing mirrored horizontal bars outward from a central axis for metrics such as possession percent, shots, expected goals, turnovers, and fouls. Optional period selector chips switch between the full match and individual halves, quarters, or periods.
- Pick: comparing two teams' statistical totals side by side for one match. Not minute-by-minute events (`MatchFeed`), individual player stat tables (`BoxScore`), or single-series bar charts (`Bars`).
- Writes: `home` text(20), `away` text(20), `periods` text(12) each 0–5, `periodAt` integer 0–4 (default 0), `metrics` of `label` text(24), `homeValue` number ≥ 0, `awayValue` number ≥ 0, `unit` (`count` default, `percent`), 2–10; `style`. Mirrored bar proportions and leading-side highlights are computed by code from each pair's values.
- Styles: `mirrored` (default, paired horizontal meters extending left and right from center), `rows` (aligned numeric comparison rows without bar tracks).
- Parts → actions: `period select` (switches active period slice).
- States: filled, empty (match stats unavailable), loading.
- Real path: match stat totals aggregated from recorded match events on the device or fetched from a sports data service.
- Density: `meta.dense: true`, weight 3; up to ten paired statistical metrics compare two sides in one view.

### `BoxScore` · planned · data · phone
A period, quarter, set, or inning line score across the top followed by a team-switched scrollable tabular player stat sheet (for example `MIN`, `PTS`, `REB`, `AST`, or `AB`, `H`, `R`, `RBI`, or `RTG`). Sticky player names stay pinned on the left while stat columns scroll sideways, and tapping a player row opens their profile when linked.
- Pick: per-player match statistics alongside a period-by-period team line score. Not league-wide team tables (`Standings`), one player's profile (`Profile` + `Stats`), or live scorekeeping (`Scoreboard`).
- Writes: `home` text(20), `away` text(20), `periods` of `label` text(6), `home` number, `away` number, 1–9; `columns` text(8) each 3–8, `homePlayers` of `name` text(20), `pos` text(4) optional, `stats` text(8) each 3–8, `goto` optional, 1–16; `awayPlayers` of the same shape, 1–16; `team` (`home` default, `away`), `style`. Final team scores are computed by code from `periods`.
- Styles: `full` (default, line score header, team switch, and scrollable player stat table), `linescore` (period line score only).
- Parts → actions: `team select` (`home` or `away`), players `root press` (when linked via `goto`).
- States: filled, empty (box score not yet recorded), loading.
- Real path: player stat sheets entered on the scorekeeper's phone or fetched from a league stats service; renders using `KitTable`.
- Density: `meta.dense: true`, weight 3; sticky player names and up to eight stat columns across sixteen players per side.

### `MomentumChart` · planned · data · service
A live win-probability curve or minute-by-minute attack momentum graph centered on an equal-split baseline between home and away teams, marking major scoring, turnover, or red-card inflections along the match clock. Selecting a marker reads out the clock time, event summary, and exact momentum or win-probability value.
- Pick: showing how match momentum or win probability shifted over game time. Not team stat totals (`MatchStats`), personal metric trends (`Sparkline`), or business charts (data `LineChart`).
- Writes: `home` text(20), `away` text(20), `mode` (`win_prob` default, `momentum`), `points` of `id` text(12), `clock` text(12), `value` number −100–100 (for `momentum`, positive favors home) or 0–100 (for `win_prob`, 50 = even), `event` text(40) optional, 6–60; `style`. Centered baseline, favored side label, and current probability delta are computed by code; renders with `KitLinePlot`.
- Styles: `curve` (default, centered baseline plot with inflection markers), `compact` (compact momentum curve without event callouts).
- Parts → actions: points `root select` (inspects an inflection point's clock and event).
- States: filled, empty (momentum feed unavailable), loading.
- Real path: live win-probability and momentum series streamed from a sports analytics service.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `club` | Our next match | `next` | Header, Fixtures[next], Squad, Button |
| `match` | One match | `live`, `lineup` | `live`: Header[back], Scoreboard, MatchFeed · `lineup`: Header[back], Scoreboard, Lineup |
| `league` | The season | `table`, `results` | `table`: Header, Segmented, Standings · `results`: Header, Fixtures, SectionTitle, List[ranked] |
| `cup` | A tournament | `bracket` | Header, Bracket, Fixtures |

## Worked example: Sunday Kickers

A five-a-side team. `club` shows Sunday's match at 10:00 with meet at 09:40 in blue kit and 6 of 7 players
available; the captain picks the side; during the match one player keeps score on `Scoreboard[keeper]` and
adds goals to `MatchFeed`; `league/table` shows the team third; `league/results` lists top scorers.
Signature: `count_up` on the score.

## Tiers

Entering fixtures, scores, lineups and results works on one phone (`phone`); teammates following them, and
`Squad` answers, need a shared app (`people` parts). A first showcase shows the captain's view.

## Build notes

- Order: `Fixtures`, `Scoreboard`, `Squad`, `Standings`, `Lineup`, `MatchFeed`, `Bracket`; Wave 6 additions follow in order: `MatchStats`, `BoxScore`, `MomentumChart`.
- Points use 3 for a win and 1 for a draw by default; other sports set it in the brief.
- Wave 6 option upgrades on existing components: `Scoreboard` adds `sport` (`football`, `basketball`, `baseball`, `tennis`, `hockey`, `generic`), optional `periods`, `possession`, and baseball/softball `outs`/`balls`/`strikes`/`bases`; `Lineup` adds per-player `rating`, `cards`, `goals` badges in `list` (`court`, `diamond`, and pitch-marker badges are deferred until `KitPitch` supports them); `MatchFeed` replaces numeric `minute` `0–130` with flexible `clock` text(12) (`"67'"`, `"Q3 04:12"`, `"Top 7th"`) and expands `kind` across sports; `Fixtures` adds `style: "list" | "next" | "scoreboard"` with `live` boolean and `clock`; `Standings` adds optional `group` text(16) and `format` (`football_pts`, `pct_gb` for NBA/MLB/NFL).
- Wave 6 bases & boundaries: `MatchStats` composes mirrored bars over `KitMeter`, `BoxScore` reuses `KitTable`, and `MomentumChart` uses `KitLinePlot` with an optional centered baseline prop. Fantasy rosters, draft boards, waiver claims, player prop pick'ems, and sportsbook odds/bet slips stay out in `fantasy`; solo run/ride logs stay in `health`.

## Open questions

- **Individual sports (tennis ladders, golf scores)?** Default: `List` style `ranked` and `Stats`; a golf
  scorecard waits for misses.
