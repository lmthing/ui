## Purpose

Follow the current score or keep score for both sides.

## Pick

The score and match clock for one contest between a home side and an away side. Not a practice result (Result), one adjustable count (Counter) or a standalone clock (Timer).

## Writer

- Use style "keeper" only when a scorekeeper must change scores or operate the clock. Use "display" for following the match. On a screen with MatchFeed, each score must equal its side’s seeded goal count.
- To hide just the written period, write {"detail":"brief","emphasis":null}. Keep the period in the data and keep the scores, status and clock visible. Never write an axis default; leave every unrequested axis null.
- For a named sport set sport; use "baseball" for baseball or softball. For recorded period scores use periods: [{ "label": "Q1", "home": 12, "away": 9 }]. Period scores are not cumulative.
- Use possession "home" or "away" for the side with the ball. Only baseball may have outs (0–2), balls (0–3), strikes (0–2), and bases (occupied first/second/third; [] means empty).
