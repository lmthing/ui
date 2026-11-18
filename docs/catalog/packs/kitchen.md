# `kitchen` pack

**Status:** new · **Wave:** 2 · **Pick line:** Food at home: recipes, meal plans, groceries, the pantry, food
logs. Not selling food (`commerce`).

## Purpose

Everything about food in a household: cooking from a recipe with the right amounts and timers, planning the
week's meals, the shopping list that follows from it, what is in the cupboard and when it goes off, and a
simple log of what was eaten.

## Apps it serves

Family recipe box, weekly meal planner, shared grocery list, pantry and fridge tracker against food waste,
calorie or protein log (with `health`), baby food planner, batch-cooking helper, allotment harvest to recipe.

## What the core already covers

- A recipe's photo and headline: `Hero` style `photo`; its time, servings and difficulty: `KeyValue` style
  `grid`; its tags: `Chips`; a grid of recipes: `List` style `cards` or `shelf`.
- Calories and macros against targets: `Progress` (the planned `Macros` is dropped as its duplicate).
- One kitchen timer: `Timer`; a cooking video: `Player` style `video`.
- Rating a recipe: `Scale` style `stars`; notes on it: `Composer` style `entry`.

## Components (7)

### `Ingredients` · planned · input · phone
A recipe's ingredients with amounts that scale with a servings stepper at the top, grouped (for the dough,
for the filling), each tickable while cooking, with a metric or US switch.
- Pick: a recipe's ingredients and amounts. Not a shopping list (`GroceryList`), not jobs (`Checklist`),
  not what is in the cupboard (`Pantry`).
- Writes: `servings` 1–24, `groups` of `label` text(20) optional, `items` of `name` text(28), `amount`
  number optional, `unit` (`g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `piece`, `pinch`, `none`), `note`
  text(20) optional, 1–16, 1–3; `system` (`metric`, `us`). Scaled amounts and conversions are computed.
- Parts → actions: `servings increment`, `servings decrement`, items `have check`, `system select`,
  `shop press` (adds the unticked ones to the grocery list). · States: filled.
- Real path: recipe data on the device.

### `CookSteps` · planned · action · phone
Cooking mode: one step at a time in large type, the ingredients that step uses, a timer button when the
step has a time, and next and back; the screen stays awake.
- Pick: following a recipe step by step while cooking. Not a lesson (learning `Lesson`), not a flow
  through screens (`Steps`), not chapters of a recording (media `ChapterList`).
- Writes: `steps` of `text` text(200), `uses` text(20) each 0–4, `minutes` number optional, 1–20; `at`.
- Parts → actions: `next press`, `back press`, `timer start`, `timer stop`. · States: filled, success (done).
- Real path: steps on the device; the screen is kept awake while cooking.

### `MealPlan` · planned · input · phone
The week as rows of days and columns of meals (breakfast, lunch, dinner), each cell a recipe name with a
small photo or an add button, today highlighted.
- Pick: planning meals across a week. Not a calendar of days with marks (`Calendar`), not a staff rota (team
  `Roster`), not a class timetable (learning `Timetable`).
- Writes: `week` date (Monday), `meals` subset of (`breakfast`, `lunch`, `dinner`, `snack`), `cells` of
  `day` 0–6, `meal`, `title` text(24), `photo` optional, `goto`, 0–28.
- Parts → actions: cells `root press`, empty cells `add press`. · States: filled, empty.
- Real path: plans stored on the device; sharing with a household needs a shared app.
- Kit: `KitWeekMatrix`.

### `GroceryList` · planned · input · phone
The shopping list grouped by aisle (produce, dairy, bakery…), each item with a quantity, ticked items
sliding to the bottom, and who added it when shared.
- Pick: what to buy, ticked off in the shop. Not a basket in an online shop (commerce `Cart`), not a
  recipe's ingredients (`Ingredients`), not general jobs (`Checklist`).
- Writes: `aisles` of `label` text(16), `items` of `name` text(28), `qty` text(12) optional, `got`
  boolean, `by` text(12) optional, 1–12, 1–8.
- Parts → actions: items `got check`, `add type`. · States: filled, empty, success (all got).
- Signature: `check_burst` (the same moment as core `Checklist`).
- Real path: the list on the device; a shared list needs the household on a shared app (`by` and others'
  additions are `people`).

### `Pantry` · planned · data · phone
What is in the cupboard, fridge and freezer: each item with a quantity, where it is, and its use-by date,
items expiring soon at the top in `warn` and expired ones in `bad`.
- Pick: food at home and when it goes off. Not things owned in general (inventory `Things`), not a
  shopping list (`GroceryList`).
- Writes: `items` of `name` text(24), `qty` text(12), `place` (`cupboard`, `fridge`, `freezer`), `useBy`
  date optional, `goto`, 1–20. The order and tones are computed from `useBy`. · Dense.
- Parts → actions: items `root press`, items `used press` (in `confirmParts`: it removes the item). · States: filled, empty.
- Real path: items typed in or scanned with `Camera` kind `scan`; dates on the device.

### `FoodLog` · planned · input · phone
Today's food by meal: each meal with its items and calories, an add button per meal, and the day's total
against the target at the top.
- Pick: logging what was eaten. Not a plan for the week (`MealPlan`), not money spent (money
  `Transactions`).
- Writes: `meals` of `meal` (`breakfast`, `lunch`, `dinner`, `snack`), `items` of `name` text(28),
  `kcal` number, `amount` text(12) optional, 0–6, 1–4; `target` number optional; `goto` (the add-food
  screen). Calorie totals are computed; macros belong in a `Progress` above it. · Dense.
- Parts → actions: meals `add press` (goes to `goto`), items `root press`. · States: filled, empty.
- Real path: entries on the device; a food database to look items up is a `service`.

### `KitchenTimers` · planned · action · phone
Several named timers running at once (pasta 6:12, oven 18:40), each with its own progress ring, pause and
add a minute, the one finishing soonest first.
- Pick: two or more timers at once while cooking. Not one timer (`Timer`), not a step's timer inside cooking
  mode (`CookSteps`).
- Writes: `timers` of `label` text(16), `seconds` 1–14400, 1–6.
- Parts → actions: timers `root start`, timers `root stop`, timers `more press` (adds a minute). · States: filled, empty.
- Real path: timers on the device with an alarm (notifications, `ok`).

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `recipe` | One recipe | `overview`, `cook` | `overview`: Header[back], Hero[photo], KeyValue[grid], Ingredients, Button · `cook`: Header[back], CookSteps, KitchenTimers |
| `mealweek` | The week's meals | `week` | Header, MealPlan, Button |
| `groceries` | Buying food | `list`, `pantry` | `list`: Header, GroceryList, Button · `pantry`: Header, Segmented, Pantry, Button |
| `food` | What I ate | `day`, `add` | `day`: Header, Progress, FoodLog · `add`: Header, Search, List, Button |
| `recipes` | My recipe box | `browse` | Header, Search, Chips, List[cards] |

## Worked example: Supper

A family recipe box and planner. `recipe/overview` shows Nonna's lasagne with servings scaled from 6 to 4;
`recipe/cook` steps through it with the béchamel and oven timers running together; `mealweek` puts it on
Thursday; `groceries/list` adds the missing ingredients by aisle; `groceries/pantry` warns that the ricotta goes off
tomorrow. Signature: `check_burst` on the grocery list.

## Tiers

`GroceryList` sharing needs the household on a shared app; a food database lookup in `FoodLog` is a
`service`. Everything else is `phone`.

## Build notes

- Order: `Ingredients`, `CookSteps`, `GroceryList`, `MealPlan`, `Pantry`, `KitchenTimers`, `FoodLog`.
- Unit conversion and scaling are code with fixed rules; fractions show as ½ and ¼, never 0.5.

## Open questions

- **Importing a recipe from a link?** Default: out of scope for the pack; a host feature that fills the
  components.
