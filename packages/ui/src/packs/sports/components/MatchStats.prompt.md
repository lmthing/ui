## Purpose

Compare how two teams performed on the same measurable aspects of one match.

## Pick

Compare two teams' statistical totals side by side in one match. Not match events (MatchFeed), player statistics (BoxScore), or a single series (Bars).

## Writer

- `detail: "full"` draws paired bars and figures; `detail: "brief"` keeps the numbers but omits the bars.
- If there are no period filters, use `periods: []`. The main values belong to `periodAt` (default 0). For multiple periods, each metric's `periodValues` supplies the other periods in label order and skips `periodAt`. Include only comparisons with known figures.
