## Purpose

Spot recurring highs and lows across days or two-hour time blocks.

## Pick

Shade each cell by numeric intensity across weeks of days or weekdays by two-hour blocks. Not a month of dates with event marks (Calendar) or a weekly habit checklist (HabitGrid).

## Writer

- For style "weeks" write 4 to 26 weeks of exactly 7 numbers each, and omit days. For style "hours" write exactly 7 days of 12 numbers each, and omit weeks. Days are Monday first; two-hour blocks start at midnight.
- Use JSON null for unrequested detail and emphasis, not their defaults. If asked to omit the explanatory line under the title, set only detail to brief; keep the grid and scale. Never write cells, axes or the legend.
