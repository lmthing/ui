import { z } from "zod";
import {
  isoDate,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  weekdayNames,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { KitCard, KitEmpty, KitPhoto, KitRow, KitText, KitWeekMatrix, useComponentState } from "../../../kit";
import { mealPlanLabels, mealPlanReading, mealPlanWeek, mealPlanToday } from "../copy";
// Core first: Calendar/week cannot place recipe names in a seven-day by meal matrix with empty add cells.
export const meta = {
  id: "MealPlan",
  status: "ready",
  group: "input",
  purpose: "Plan recipes across the week's days and meals.",
  pick: "A week matrix of recipes by day and meal, with empty cells to add meals. Not calendar marks (Calendar), staff shifts (Roster), or class periods (Timetable).",
  writeHints: [
    "week is a real Monday date. List each meal column once. Every filled cell has one unique day/meal pair and its meal is a listed column. Empty add cells are computed, not written.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Meal plans stored on the device; sharing requires a shared household app.",
  items: { key: "rows", parts: ["root", "title", "photo", "add"] },
  parts: ["root", "week", "meals"],
  states: ["filled", "empty"],
  actions: {
    items: { root: ["press"], add: ["press"] },
    when: { root: { filled: true }, add: { filled: false } },
  },
  read: (input, state) => {
    if (state !== "filled") return [];
    const value = input as { week: string; rows: Cell[] };
    return mealPlanReading(value.week, value.rows);
  },
} as const satisfies Meta;
const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]).meta({ kind: "text" });
export const props = z
  .strictObject({
    week: isoDate,
    meals: z.array(meal).min(1).max(4),
    cells: z
      .array(
        z.strictObject({
          day: z.int().min(0).max(6),
          meal,
          title: text(24),
          photo: photo.optional(),
          goto: screenId,
        }),
      )
      .min(0)
      .max(28),
  })
  .refine(
    (value) =>
      new Date(`${value.week}T00:00:00Z`).getUTCDay() === 1 &&
      new Set(value.meals).size === value.meals.length &&
      new Set(value.cells.map((cell) => `${cell.day}/${cell.meal}`)).size === value.cells.length &&
      value.cells.every((cell) => value.meals.includes(cell.meal)),
    { message: "Use a Monday, unique columns and unique cells within those columns" },
  )
  .overwrite((value) => ({
    ...value,
    rows: Array.from({ length: 7 }, (_, day) =>
      value.meals.map((meal) => {
        const cell = value.cells.find((cell) => cell.day === day && cell.meal === meal);
        return { day, meal, ...cell, filled: !!cell };
      }),
    ).flat(),
  }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  const cells = (items.length ? items : [undefined, undefined, undefined]).map((item, day) => ({
    day,
    meal: "dinner" as const,
    title: (item && titleOf(item, 24, thing)) ?? placeholderTitle(day),
    goto: "details",
  }));
  return { week: "2026-11-16", meals: ["dinner"], cells };
}
export const examples = [
  // Ledge: the plant keeper's household supper.
  {
    week: "2026-11-16",
    meals: ["lunch", "dinner"],
    cells: [{ day: 3, meal: "dinner", title: "Nonna's lasagne", photo: "lib:food", goto: "recipe_overview" }],
  },
  // Trot: breakfast before the walking round.
  {
    week: "2026-11-23",
    meals: ["breakfast", "snack"],
    cells: [
      { day: 0, meal: "breakfast", title: "Apple porridge", goto: "recipe_overview" },
      { day: 1, meal: "snack", title: "Yogurt and berries", goto: "recipe_overview" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("MealPlan");
export const probes = [
  choose(
    "Plan breakfast, lunch and dinner across seven days, with a recipe in each cell and add buttons in gaps",
  ),
  choose("Show this week's calendar with a mark on days I watered my plants", "Calendar"),
  write(
    "For the week starting Monday 2026-11-16, use lunch and dinner columns and put Nonna's lasagne on Thursday dinner, opening recipe_overview",
  ),
  read("Open Thursday's dinner recipe", { address: "m1/r8", action: "press" }),
  read("Add a meal for Monday lunch", { address: "m1/r1/add", action: "press" }),
] satisfies Probe[];
type Cell = { id: string } & (
  | (z.output<typeof props>["cells"][number] & { filled: true })
  | { day: number; meal: z.output<typeof meal>; filled: false; goto?: undefined }
);
function MatrixLabel({ label }: { label: string }) {
  return (
    <KitText role="caption" tone="muted" part={null}>
      {label}
    </KitText>
  );
}
function MealCell({ cell }: { cell: Cell }) {
  const photo = cell.filled && cell.photo ? { photo: cell.photo } : {};
  const leading =
    cell.filled && cell.photo ? <KitPhoto {...photo} part="photo" label={cell.title} /> : undefined;
  return (
    <KitRow
      item={cell.id}
      label={mealPlanReading("", [cell])[0]!}
      inline
      goto={cell.goto}
      leading={leading}
      leadingAlign="row"
    >
      {cell.filled ? (
        <KitText part="title" role="body" lines={2}>
          {cell.title}
        </KitText>
      ) : (
        <KitRow part="add" role="button" label={mealPlanLabels.add} inline>
          <KitText part="title" role="caption" tone="accent">
            {mealPlanLabels.add}
          </KitText>
        </KitRow>
      )}
    </KitRow>
  );
}
export function MealPlan(input: Props<typeof props, typeof meta>) {
  const { week, meals } = input;
  const { rows } = input as typeof input & { rows: Cell[] };
  const state = useComponentState();
  if (state === "empty")
    return (
      <KitCard part="root">
        <KitEmpty part="meals" decorativeIcon />
      </KitCard>
    );
  const days = weekdayNames.map((label, day) => ({
    id: String(day),
    label,
    header: <MatrixLabel label={label} />,
  }));
  const columns = meals.map((meal) => ({
    id: meal,
    label: mealPlanLabels[meal],
    heading: <MatrixLabel label={mealPlanLabels[meal]} />,
    cells: days.map((day, index) => {
      const cell = rows.find((cell) => cell.day === index && cell.meal === meal)!;
      return { id: day.id, content: <MealCell cell={cell} /> };
    }),
  }));
  const matrix = { days, rows: columns, corner: null, orientation: "daysDown" as const };
  const today = mealPlanToday(week);
  return (
    <KitCard part="root">
      <KitRow part="week" label={mealPlanWeek(week)}>
        <KitText role="heading" part={null}>
          {mealPlanWeek(week)}
        </KitText>
      </KitRow>
      <KitWeekMatrix part="meals" {...matrix} {...(today === undefined ? {} : { today })} />
    </KitCard>
  );
}
