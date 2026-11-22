## Purpose

Record foods eaten by meal and see their calories against a daily target.

## Pick

Today's eaten foods grouped by meal with calories and an add action per meal. Not a plain list (List), plans for the week (MealPlan), or calorie goals alone (Progress).

## Writer

- Write calories per food, never meal or day totals. Each meal occurs once. goto is the add-food screen; a database lookup there needs a service.
- To hide portions, set detail to "brief", but keep amount in the data. Write null for density unless explicitly asked for spacing; hiding portions does not change density.
