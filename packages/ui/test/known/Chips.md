# Chips: style-dependent item actions

`src/catalog/types/action.ts` permits a fixed action array per part. Its `when` conditions apply
to the whole part, not individual actions, and `src/catalog/agent/affordances.ts` evaluates item
conditions against the item alone, without the component's `style`.

The nearest supported declaration offers `toggle` and `select` on every item root. The view
correctly draws checkbox roots for `filter` and radio roots for `choose`, but the shared reading
test rejects `select` on a checkbox and `toggle` on a radio. This is a shared metadata limitation,
not missing item roots or incorrect visual roles.

Needed outside this task's scope: action-specific conditions that can read component props for
item actions, so `filter` offers only `toggle` and `choose` offers only `select`. Remove this file
once that shared API is available and Chips uses it.
