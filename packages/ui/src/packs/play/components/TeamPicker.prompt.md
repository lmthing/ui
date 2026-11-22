## Purpose

Split players into balanced random teams while preserving optional locked placements.

## Pick

Randomly allocate every player to balanced named teams with optional locks. Not deliberate selection (Choice[multi]), one random option (Spinner), or sports positions (Squad, Lineup).

## Writer

- Write 2–12 players and 2–4 distinct team labels, no more teams than players. Optional player.team is a zero-based locked index. Never write unlocked assignments, sizes or feasibility; impossible locks are runtime errors, not uneven teams.
- When only vertical stacking is requested write {"arrange":"rows"}. Leave mark and team null unless a player is explicitly highlighted or locked, respectively. Never spell out default axes.
