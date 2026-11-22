## Purpose

Track the current game player, lap and direction with next, skip and reverse.

## Pick

Game turns, laps and play direction. Not a plain roster (People), scheduled events (Timeline), or rotating household duties (Turns).

## Writer

- first is a zero-based index into players. Optional laps bounds the game; omit it for open-ended rotation. Never write current player, lap, completed turns or skips.
- To hide only the lap and direction line write {"detail":"brief","density":null}; keep any lap limit. Never write comfortable as the default.
