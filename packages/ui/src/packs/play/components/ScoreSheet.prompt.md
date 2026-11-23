## Purpose

Record players' round scores and compute totals, ranks and tied winners.

## Pick

An editable scorecard: enter each player's points for each game round, hand or hole and calculate totals and tied winners. Not one running number (Counter), final ranking (List[ranked]), a live match (Scoreboard), or arbitrary records (Table).

## Writer

- Keep exactly the requested players and rounds. Each round's points has one entry per player, in roster order: integer -999–999 or null for unplayed. Never write totals, ranks, winners or selected round.
- If requested, use goal for the target total. In each round that tracks bids, provide bids in player order with one integer or null per player; use points for what each player made. Never write a separate made field.
- For one round at a time write {"overflow":"page"} and keep all rounds in the data.
