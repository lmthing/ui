## Purpose

Record players' round scores and compute totals, ranks and tied winners.

## Pick

An editable scorecard: enter each player's points for each game round, hand or hole and calculate totals and tied winners. Not one running number (Counter), final ranking (List[ranked]), a live match (Scoreboard), or arbitrary records (Table).

## Writer

- Each round's points has exactly one entry per player, in roster order: integer -999–999 or null for unplayed. Never write totals, ranks, winners or selected round.
- When asked only for one round at a time write {"overflow":"page","density":null}. Keep every round in the data. Never write comfortable as a default.
