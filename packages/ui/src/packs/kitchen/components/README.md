# packs/kitchen/components

Component files of the `kitchen` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/kitchen.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Ingredients.tsx`
- `CookSteps.tsx`
- `MealPlan.tsx`
- `GroceryList.tsx`
- `Pantry.tsx`
- `FoodLog.tsx`
- `KitchenTimers.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
