# `fantasy` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Fantasy leagues, snake drafts, waiver markets, live
matchups, player prop pick'ems and odds/pick slips. Not managing real clubs/scores (`sports`), not casual
tabletop games (`play`).

## Purpose

Season-long fantasy leagues and player stat contests: head-to-head manager matchups with win-probability
bars, interactive starter/bench/IR lineups, multi-round snake or auction draft boards, free-agent waiver
wires with FAAB bidding, More/Less player stat projection pick cards, multi-game Spread/Moneyline/Total
odds boards, and confirmed entry/parlay pick slips. Real-world club schedules, grassroots scorekeeping, and
league tables belong to `sports`; casual board-game rounds stay in `play`.

## Apps it serves

Season-long fantasy football or basketball league app, live snake/auction draft room companion, daily
player stat pick'em contest app, sportsbook odds & parlay slip builder (powered by host contest adapters).

## What the core already covers

- Real-world club fixtures, live game scoreboards, league standings, and pitch lineups: `sports`
  (`Fixtures`, `Scoreboard`, `Standings`, `Lineup`, `MatchFeed`).
- Season fantasy standings by points: `List[ranked]`; manager bios: `Profile`; summary numbers: `Stats`.
- League trash talk, reactions, and polls: `social` (`Feed`, `Poll`) + `Bubbles`; tabletop board scores:
  `play` (`ScoreSheet`, `Bracket`).

`FantasyMatchup` stays for dual-manager head-to-head live vs projected totals and paired position slots;
`FantasyRoster` for swapping starters, bench, and IR slots against kickoff locks; `DraftBoard` for
rounds × managers draft matrices and live pick clocks; `WaiverWire` for `% rostered`, 4-week trends, FAAB
bids, and drop prompts; `PropPickCard` for player stat projection lines with 5-game hit bars and More/Less
toggles; `OddsBoard` for multi-game Spread/ML/Total lines with movement arrows; and `PickSlip` for leg
summaries, correlation flags, stake, payout, and confirmed submission.

## Components (7)

### `FantasyMatchup` · planned · data · people
Head-to-head fantasy duel comparing two managers' team badges, live points versus projected totals, and a
central win-probability share bar (`KitShare`), above paired starter position rows (`QB`, `RB`, `WR`,
`FLEX`) displaying each player's game status, live score, and projection.
- Pick: comparing two fantasy managers' live and projected matchup totals and starter slots. Not real-world
  club scoreboards (sports `Scoreboard`), not plain rankings (`List[ranked]`), not editing your own bench
  (`FantasyRoster`).
- Writes: `weekLabel` text(16), `home` of `team` text(24), `manager` text(20), `avatar` photo optional,
  `live` number ≥ 0, `projected` number ≥ 0; `away` of same fields; `winProb` number 0–100, `slots` of
  `pos` text(6), `homePlayer` text(24), `homeMeta` text(24), `homePts` number, `homeProj` number,
  `awayPlayer` text(24), `awayMeta` text(24), `awayPts` number, `awayProj` number, 2–8; `style`. Point
  differential and win-probability split (`100 - winProb`) are computed by code.
- Styles: `paired` (default, manager header, win-prob bar, and side-by-side starter rows), `summary`
  (head-to-head score header, win probability bar, and top 3 key player swings).
- Parts → actions: slots `root press` (inspect player log), `refresh press`.
  `meta.partTiers: { refresh: "service" }`.
- States: filled, empty, loading, error (live stat feed paused).
- Real path: league matchup pairings shared across managers (`people`) fed by live pro scoring telemetry
  (`service`).
- Density: `meta.dense: true`, weight 3; paired starter duels compare up to 8 position rows side by side.

### `FantasyRoster` · planned · input · people
Interactive starter, bench, and IR roster manager displaying position tags (`QB`, `RB`, `WR`, `TE`, `FLEX`,
`BN`, `IR`), player name and team, opponent/game status (`Live Q3`, `Sun 13:00`, `BYE`), injury tags (`Q`,
`D`, `O`, `IR`), projected versus actual points, and tap-to-swap slot selection. Locked games stay
disabled once kickoff starts.
- Pick: setting an active fantasy lineup across starter, bench, and IR slots. Not real-world team pitch
  formations (sports `Lineup`), not player availability answers (sports `Squad`), not head-to-head duels
  (`FantasyMatchup`).
- Writes: `teamName` text(24), `weekLabel` text(16), `slots` of `slotId` text(20), `slotType` (`starter`,
  `bench`, `ir`), `pos` text(6), `player` text(24) optional, `proTeam` text(6) optional, `opponent`
  text(16) optional, `gameStatus` text(16), `locked` boolean (default false), `injury` (`Q`, `D`, `O`, `IR`)
  optional, `proj` number ≥ 0 optional, `actual` number ≥ 0 optional, 2–20; `selectedSlot` text(20)
  optional, `style`. Starter projected and actual totals are computed by code; locked players prevent swaps.
- Styles: `lineup` (default, Starter / Bench / IR sections with swap actions), `compact` (starters only
  with total projection).
- Parts → actions: slots `root select` (unlocked only), slots `swap move` (to eligible slot),
  `optimize press`.
- States: filled, empty, loading, success (lineup saved), error (ineligible slot or game already locked).
- Real path: manager's lineup stored in a shared fantasy league (`people`), enforcing real-world kickoff
  locks from a schedule service (`service`).
- Density: `meta.dense: true`, weight 3; fantasy rosters display up to 20 starter, bench, and IR slots.

### `DraftBoard` · planned · input · people
Multi-round snake or auction fantasy draft matrix (`KitTable`: rounds × managers) with color-coded position
tiles, a live on-the-clock pick countdown banner, and an available/queued player drawer with Draft Now and
auto-pick controls.
- Pick: running or following a live multi-manager fantasy player draft board. Not knockout tournament cups
  (sports `Bracket`), not random party teams (play `TeamPicker`), not post-draft waivers (`WaiverWire`).
- Writes: `draftMode` (`snake`, `auction`), `round` number 1–20, `pickNumber` number ≥ 1, `onClockTeam`
  text(20), `secondsLeft` number 0–300, `teams` text(16) each 4–14; `picks` of `round` number 1–20, `col`
  number 0–13, `player` text(20), `pos` text(6), 0–60; `queue` of `playerId` text(24), `name` text(24),
  `pos` text(6), `adp` number > 0, `proj` number ≥ 0, 0–6; `myTurn` boolean (default false), `style`. Snake
  direction and countdown timer updates run in code.
- Styles: `board` (default, rounds × managers grid with live clock and queue), `queue` (available/queued
  player list with Draft action).
- Parts → actions: `draft press` (when `myTurn` is true), queue `root press`, `auto toggle`.
- States: filled, empty (pre-draft lobby), loading, success (pick submitted), error (clock expired or
  player already drafted).
- Real path: real-time draft picks and turn clock synchronized across league managers (`people`).
- Density: `meta.dense: true`, weight 3; draft matrices show dozens of color-coded position tiles across
  rounds and managers.

### `WaiverWire` · planned · input · people
Available free-agent player market with position filter chips, `% rostered`, projected points, 4-week point
trend mini bars (`KitBars`), waiver clearance date, FAAB bid or priority input, and an explicit drop-player
selector before submitting a claim.
- Pick: scouting, bidding on, and claiming unrostered free-agent players. Not retail catalogs (commerce
  `ProductGrid`), not job candidates (hiring `Candidate`), not active lineups (`FantasyRoster`).
- Writes: `faabRemaining` number ≥ 0 optional, `players` of `playerId` text(24), `name` text(24), `pos`
  text(6), `proTeam` text(6), `rosteredPct` number 0–100, `proj` number ≥ 0, `trend4w` of number ≥ 0, 4;
  `waiverClear` text(16) optional, 1–16; `dropCandidates` of `playerId` text(24), `name` text(24), `pos`
  text(6), 0–6; `bid` number ≥ 0 optional, `dropId` text(24) optional, `style`. Code checks `bid <=
  faabRemaining` and requires a drop selection when the roster is full.
- Styles: `market` (default, free-agent scouting table with 4-week bars and claim controls), `bids`
  (pending waiver claims with edit/cancel triggers).
- Parts → actions: `pos select`, players `claim press`, `bid set`, `drop select`, `cancel press`.
  `meta.confirmParts: ["cancel"]`.
- States: filled, empty, loading, success (waiver claim queued), error (insufficient FAAB or player claimed).
- Real path: shared league free-agent pool (`people`) processed according to league waiver priority or
  FAAB rules.
- Density: `meta.dense: true`, weight 3; waiver scouting lists up to 16 free agents with trend bars and
  rostered shares.

### `PropPickCard` · planned · input · service
Player stat projection card (`26.5 Points`, `1.5 Goals+Assists`) showing player portrait, upcoming matchup
context, a 5-game hit-rate bar strip (`KitBars`), and binary `More` / `Less` selection pills that feed
into `PickSlip`.
- Pick: picking over (`More`) or under (`Less`) on an individual player stat projection. Not group opinion
  polls (social `Poll`), not graded quizzes (learning `Quiz`), not team game lines (`OddsBoard`).
- Writes: `props` of `propId` text(24), `player` text(24), `team` text(8), `opponent` text(16), `photo`
  optional, `statLabel` text(24), `line` number > 0, `last5` of number ≥ 0, 5; `pick` (`more`, `less`,
  `none`, default `none`), `demon` boolean (default false), 1–6; `style`. Recent hit rate against `line`
  is computed by code from `last5`.
- Styles: `cards` (default, portrait cards with 5-game hit bars and More/Less pills), `compact` (tight
  player projection rows).
- Parts → actions: props `more select`, props `less select`, props `root press` (player game log).
- States: filled, empty, loading, error (player ruled out or line locked).
- Real path: player stat projections and recent game-log metrics fetched from a sports data service
  (`service`).

### `OddsBoard` · planned · data · service
Matchup lines grid (`KitTable`) displaying Spread, Moneyline, and Over/Under Total cells per matchup with
live line-movement arrows (`▲` `good`, `▼` `bad`), lock states on in-play or suspended markets, and
selectable cells that add picks to `PickSlip`.
- Pick: comparing team game spreads, moneylines, and totals across multiple matches. Not player stat
  projections (`PropPickCard`), not club match fixtures (sports `Fixtures`), not stock quotes (invest
  `Holdings`).
- Writes: `league` text(12), `games` of `gameId` text(24), `away` text(16), `home` text(16), `start`
  text(16), `awaySpread` text(12), `homeSpread` text(12), `awayMl` text(10), `homeMl` text(10), `total`
  text(12), `movement` (`up`, `down`, `flat`) optional, `locked` boolean (default false), 1–12;
  `selectedCell` text(32) optional, `style`. Code disables selection on locked markets.
- Styles: `grid` (default, 3-column Spread / Moneyline / Total table), `compact` (Spread and Total only).
- Parts → actions: games `spread select`, games `ml select`, games `total select`, `refresh press`.
- States: filled, empty, loading, error (odds feed unavailable).
- Real path: live matchup odds and market lock updates streamed from an odds service (`service`).
- Density: `meta.dense: true`, weight 3; game-lines matrices present Spread, Moneyline, and Total cells
  across up to 12 matchups.

### `PickSlip` · planned · input · service
Collapsible entry or parlay slip listing 2–6 selected legs, correlation conflict warnings when two picks
share one game/team, entry stake control, computed multiplier and projected payout (`moneyLine`), and a
confirmed submission trigger.
- Pick: reviewing, sizing, and submitting selected fantasy prop picks or parlay legs. Not retail shopping
  carts (commerce `Cart`), not personal loans (money `Loan`), not game line boards (`OddsBoard`).
- Writes: `legs` of `legId` text(24), `title` text(32), `selection` text(24), `conflict` boolean (default
  false), 0–6; `stake` number > 0, `multiplier` number > 0, `collapsed` boolean (default false), `style`.
  Projected payout (`stake × multiplier`), currency formatting via `moneyLine`, and minimum-leg/conflict
  submission guards are computed by code.
- Styles: `slip` (default, expandable leg list, stake input, payout summary, and Submit trigger), `bar`
  (collapsed bottom summary showing leg count and payout).
- Parts → actions: `toggle toggle`, legs `remove press`, `stake set`, `submit press`, `clear press`.
  `meta.confirmParts: ["remove", "submit", "clear"]`.
- States: filled, empty (no legs picked), loading, success (entry submitted), error (line moved or invalid
  leg correlation).
- Real path: validates entry legs, current multipliers, and contest submission through a host contest
  service (`service`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `fantasy_team` | Set fantasy starters/bench, follow matchups, and view standings | `fantasy_roster`, `fantasy_matchup`, `fantasy_standings` | `fantasy_roster`: Header, Segmented, FantasyRoster, Note · `fantasy_matchup`: Header, Segmented, FantasyMatchup, Note · `fantasy_standings`: Header, Stats, List[ranked], Note |
| `draft_room` | Pick players on a live multi-round draft board | `fantasy_board` | Header, Search, DraftBoard |
| `waiver_market` | Scout and claim available free agents with FAAB bids | `fantasy_available` | Header, Search, WaiverWire, Note |
| `picks_board` | Pick player stat props, compare matchup odds, and submit pick slips | `fantasy_props`, `fantasy_odds` | `fantasy_props`: Header, Search, PropPickCard, PickSlip · `fantasy_odds`: Header, Segmented, OddsBoard, PickSlip |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `fantasy_`-prefixed and
unique. Recipes use only core plus `fantasy`, stay within weight 7, and include at most one dense
weight-3 component per screen.

## Worked example: Sunday Gridiron (fantasy league & pick'em)

A 10-team fantasy league opens `draft_room/fantasy_board` where `DraftBoard` counts down Round 4 Pick 3
and drafts a wide receiver from the queue. During the season, the manager swaps an injured running back to
IR on `fantasy_team/fantasy_roster` (`FantasyRoster`), places a `$12` FAAB bid on
`waiver_market/fantasy_available` (`WaiverWire`), and tracks a narrow `118.4 vs 114.2` Sunday night lead
with a `58%` win bar on `fantasy_team/fantasy_matchup` (`FantasyMatchup`). On the contest tab,
`picks_board/fantasy_props` pairs `PropPickCard` (`More 26.5 Pts`, `Less 1.5 Pass TD`) with `PickSlip`
computing a `3×` payout, and `picks_board/fantasy_odds` compares spread and total lines on `OddsBoard`.
Signature: `count_up` on live fantasy score updates.

## Tiers

`FantasyMatchup`, `FantasyRoster`, `DraftBoard`, and `WaiverWire` operate across league members (`people`)
backed by real-world game schedules and stat feeds (`service`). `PropPickCard`, `OddsBoard`, and `PickSlip`
depend on live sports projection/odds feeds and contest submission services (`service`).

## Build notes

- Order: `FantasyRoster`, `FantasyMatchup`, `WaiverWire`, `DraftBoard`, `PropPickCard`, `OddsBoard`,
  `PickSlip`.
- Reuse `KitTable`, `KitScore`, `KitShare`, `KitBars`, `KitTime`, and `KitInput`; no new kit base or
  signature is needed.
- Keep `sports` (real clubs, fixtures, match feeds, brackets) and `fantasy` (manager rosters, snake drafts,
  FAAB waivers, player props) strictly separate; pair both packs only when an app explicitly combines live
  box scores with fantasy leagues.
- Entry stakes and payouts use numeric values formatted with `moneyLine` under the brief's currency.

## Open questions

- **New actions?** None. Swapping slots uses `move`, selecting props/odds uses `select`, claims/drafts use
  `press`, FAAB/stake entry uses `set`, and slip removals/submissions use confirmed `press`.
- **Auction nomination timer?** Reuse `DraftBoard` `draftMode: "auction"` with `secondsLeft` rather than
  adding a second draft component.
