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

## Components (7)

### `Fixtures` · planned · data · people
Matches in date order: date and time, the opponent with a round initial badge, home or away, the venue, and
for played ones the score with a win, draw or loss pill; or the next match alone as a large card with meet
time and kit.
- Pick: the team's matches, coming and played. Not one match live (`Scoreboard`), not an appointment
  (booking `Appointment`), not a community event (social `EventCard`).
- Writes: `matches` of `date`, `time` HH:MM, `opponent` text(24), `home` boolean, `venue` text(28)
  optional, `us` number optional, `them` number optional, `meet` HH:MM optional, `kit` text(16) optional,
  `goto`, 1–6; `style`. Results pills are computed from the scores.
- Styles: `list` (default), `next` (the first match as a large card).
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: fixtures entered by the club in a shared app. · Aliases: fixtures, matches, results, gamedays.

### `Scoreboard` · planned · data · people
Two sides with large scores, the period and clock between them, and the status (not started, live, half
time, full time); in `keeper` style each side has plus and minus buttons for the person keeping score.
- Pick: the score of one match now. Not a practice result (learning `Result`), not a count of one thing
  (`Counter`).
- Writes: `home` text(20), `away` text(20), `homeScore` number, `awayScore` number, `period` text(12)
  optional, `status` (`upcoming`, `live`, `break`, `final`), `style`.
- Styles: `display` (default), `keeper`. · Parts → actions: `home increment`, `home decrement`, `away
  increment`, `away decrement` (keeper). · States: filled, loading. · Kit: `KitScore`.
- Real path: the score kept on one phone; following it live elsewhere needs a shared app.
- Aliases: scoreboard, score, livescore, scorekeeper. (Shadows core `Scale`'s alias `score` while `sports`
  is loaded.)

### `Standings` · planned · data · phone
A league table: position, team, played, won, drawn, lost, goal difference, points and recent form as five
pills; the person's team tinted; promotion and relegation places marked by a line.
- Pick: a league table of teams with several columns. Not a ranking by one value (`List` style `ranked`),
  not a general table of records (data `Table`).
- Writes: `rows` of `team` text(20), `played`, `won`, `drawn`, `lost`, `for`, `against` numbers, `form`
  (`w`, `d`, `l`) each 0–5, 2–20; `mine` index optional; `lines` indexes 0–2. Points, difference and order
  are computed. · Dense.
- Parts → actions: rows `root press`. · States: filled, loading. · Kit: `KitTable`.
- Real path: results entered in a shared app. · Aliases: standings, leaguetable, table.
  (Shadows core `List`'s alias `table` while `sports` is loaded and `data` is not.)

### `Lineup` · planned · data · people
The starting players on a drawn pitch in their lines (keeper, defence, midfield, attack), each as a numbered
circle with a surname, and the substitutes in a row below; or as a plain list by position.
- Pick: who plays where in one match. Not who is available (`Squad`), not a staff rota (team `Roster`).
- Writes: `lines` of `players` of `number` 0–99, `name` text(16), 1–6, 1–5 (from the back); `subs` of
  `number`, `name`, 0–7; `style`.
- Styles: `pitch` (default), `list`. · Parts → actions: players `root press`. · States: filled, empty.
- Real path: the coach's selection in a shared app. · Aliases: lineup, formation, startingxi, teamsheet.

### `MatchFeed` · planned · data · people
What happened in a match by the minute: goals, cards, substitutions and notes, each on the side of the team
it belongs to, the newest first while live.
- Pick: events within one match. Not a day's plan (`Timeline`), not posts in a community (social `Feed`).
- Writes: `events` of `minute` 0–130, `side` (`home`, `away`), `kind` (`goal`, `card_yellow`, `card_red`,
  `sub`, `note`), `text` text(36), 1–12. · Dense.
- Parts → actions: none. · States: filled, empty. · Real path: events added by the scorekeeper in a shared
  app. · Aliases: matchfeed, matchevents, commentary, liveupdates.

### `Squad` · planned · input · people
Who is available for the next match: each player with yes, maybe or no and a reason, the count of yes
against the number needed, and for the coach a tick to select them.
- Pick: players' availability and selection for one match. Not guests' replies (events `GuestList`), not
  staff shifts (team `Roster`).
- Writes: `needed` number, `players` of `name` text(20), `photo`, `answer` (`yes`, `maybe`, `no`,
  `none`), `reason` text(24) optional, `picked` boolean, 1–20; `coach` boolean. Counts are computed. · Dense.
- Parts → actions: own row `answer select`, players `picked check` (coach). · States: filled, empty.
- Real path: answers collected in a shared app. · Aliases: squad, availability, selection, whoscoming.

### `Bracket` · planned · data · people
A knockout cup as rounds side by side (quarter-finals, semis, final): each tie with two names and scores,
winners carried to the next round, the person's team highlighted.
- Pick: a knockout tournament. Not a league table (`Standings`), not a list of matches (`Fixtures`).
- Writes: `rounds` of `label` text(16), `ties` of `a` text(16), `b` text(16), `aScore` and `bScore`
  numbers optional, 1–8, 1–4; `mine` text(16) optional. Winners are computed from the scores. · Dense.
- Parts → actions: ties `root press`. · States: filled, loading.
- Real path: results entered in a shared app. · Aliases: bracket, knockout, cup, draw.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `club` | Our next match | `next` | Header, Fixtures[next], Squad, Button |
| `match` | One match | `live`, `lineup` | `live`: Header[back], Scoreboard, MatchFeed · `lineup`: Header[back], Lineup |
| `league` | The season | `table`, `results` | `table`: Header, Segmented, Standings · `results`: Header, Fixtures, List[ranked] |
| `cup` | A tournament | `bracket` | Header, Bracket |

## Worked example: Sunday Kickers

A five-a-side team. `club` shows Sunday's match at 10:00 with meet at 09:40 in blue kit and 6 of 7 players
available; the captain picks the side; during the match one player keeps score on `Scoreboard[keeper]` and
adds goals to `MatchFeed`; `league/table` shows the team third; `league/results` lists top scorers.
Signature: `count_up` on the score.

## Aliases that shadow the core

With `sports`: `score` → `Scoreboard` (otherwise `Scale`); `table` → `Standings` (otherwise `List`, unless
`data` is also loaded, when `Table` wins).

## Tiers

Everything except `Standings` is fully useful only with the team on a shared app. A first showcase shows the
captain's view with sample players.

## Build notes

- Order: `Fixtures`, `Scoreboard`, `Squad`, `Standings`, `Lineup`, `MatchFeed`, `Bracket`.
- Points use 3 for a win and 1 for a draw by default; other sports set it in the brief.

## Open questions

- **Individual sports (tennis ladders, golf scores)?** Default: `List` style `ranked` and `Stats`; a golf
  scorecard waits for misses.
