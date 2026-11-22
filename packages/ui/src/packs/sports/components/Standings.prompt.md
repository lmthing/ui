## Purpose

Compare teams in a league and see our place in the season.

## Pick

A league table with played, wins, draws, losses, goal difference, points and recent form. Not a ranking on one value (List) or a general records table (Table).

## Writer

- Write wins, draws, losses and goals for and against; never write played, points, goal difference or rank. Mine is a zero-based index in the input rows; lines are one-based cut positions in the ordered table.
- To hide recent form, write detail "brief" and still supply the form data. Omit scoring unless the league awards nonstandard points per win or draw.
- For standings by win percentage and games behind use format "pct_gb"; otherwise omit format or use "football_pts". Put the conference or division label in group, not in team names. For ties write drawn; when goal totals or recent form are unavailable use for: 0, against: 0 and form: [].
