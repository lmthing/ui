import type { ReactNode } from "react";
import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { mealPlanDaysFor, mealPlanReading, mealPlanToday, mealPlanTotals, mealPlanWeek } from "../copy";
import { kitchenWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-MealPlan.generated";
// Core first: Calendar/week cannot place recipe names in a seven-day by meal matrix with empty add cells.
export const meta = {
  id: "MealPlan",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Meal plans stored on the device; sharing requires a shared household app.",
  items: { key: "rows", parts: ["root", "title", "photo", "add"] },
  variants: { media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "week", "meals", "kcal_1", "kcal_2", "kcal_3", "kcal_4", "kcal_5", "kcal_6", "kcal_7"],
  states: ["filled", "empty"],
  actions: {
    items: { root: ["press"], add: ["press"] },
    when: { root: { filled: true }, add: { filled: false } },
  },
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const value = input as {
      week: string;
      rows: Parameters<typeof mealPlanReading>[1];
      style?: "week" | "day";
    };
    return mealPlanReading(value.week, value.rows, lang, value.style === "day");
  },
} as const satisfies c.Meta;
const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]).meta({ kind: "text" });
// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["week", "day"]).default("week"),
    week: c.isoDate,
    meals: z.array(meal).min(1).max(4),
    cells: z.array(z.strictObject({
      day: z.int().min(0).max(6), meal, title: c.text(24), photo: c.photoOrImage(["dish"]).optional(),
      goto: c.screenId, kcal: z.number().min(0).max(10000).optional(),
    })).min(0).max(28),
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
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const cells = (items.length ? items : [undefined, undefined, undefined]).map((item, day) => ({
    day,
    meal: "dinner" as const,
    title: (item && c.titleOf(item, 24, thing)) ?? c.placeholderTitle(day, lang),
    goto: "details",
  }));
  return { week: "2026-11-16", meals: ["dinner"], cells };
}
const supper = {
  week: "2026-11-16",
  meals: ["lunch", "dinner"],
  cells: [{ day: 3, meal: "dinner", title: "Nonna's lasagne", photo: "lib:food", goto: "recipe_overview" }],
} satisfies z.input<typeof props>;
const withKcal = { ...supper, cells: supper.cells.map((cell) => ({ ...cell, kcal: 480 })) };
export const examples = [
  supper,
  { ...supper, media: "none" },
  // Trot: breakfast before the walking round.
  {
    week: "2026-11-23",
    meals: ["breakfast", "snack"],
    cells: [
      { day: 0, meal: "breakfast", title: "Apple porridge", goto: "recipe_overview" },
      { day: 1, meal: "snack", title: "Yogurt and berries", goto: "recipe_overview" },
    ],
  },
  withKcal,
  { ...withKcal, style: "day" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("MealPlan");
export const probes = [
  choose(
    "Plan breakfast, lunch and dinner across seven days, with a recipe in each cell and add buttons in gaps",
  ),
  choose("Show this week's calendar with a mark on days I watered my plants", "Calendar"),
  write(
    "For the week starting Monday 2026-11-16, use lunch and dinner columns and put Nonna's lasagne on Thursday dinner, opening recipe_overview",
  ),
  {
    ...write(
      "A text-only meal plan for Monday 2026-11-16's week: dinners only, lasagne on Thursday opening recipe_overview. Keep lib:food as its photo but don't show photos.",
    ),
    variant: { axis: "media", value: "none" },
  },
  write(
    "Week starting Monday 2026-11-16. Thursday's lunch is Soup (200 kcal) and dinner is Pasta (450 kcal), both opening recipe_overview. Show the daily calorie total.",
  ),
  write(
    "Use a day agenda instead of a weekly grid for the week starting Monday 2026-11-16. Dinners only: Thursday lasagne opens recipe_overview; leave every other day empty.",
  ),
  read("Open Thursday's dinner recipe", { address: "m1/r8", action: "press" }),
  read("Add a meal for Monday lunch", { address: "m1/r1/add", action: "press" }),
] satisfies c.Probe[];
type Cell = { id: string } & (
  | (z.output<typeof props>["cells"][number] & { filled: true })
  | { day: number; meal: z.output<typeof meal>; filled: false; goto?: undefined }
);
function MatrixLabel({ label }: { label: string }) {
  return <kit.KitText role="caption" tone="muted" part={null} children={label} />;
}
type MealCellProps = {
  cell: Cell;
  compact?: boolean;
  stackPhoto: boolean;
  showPhoto: boolean;
  agenda?: boolean;
};
function MealCell({ cell, compact, stackPhoto, showPhoto, agenda }: MealCellProps) {
  const { lang, words } = kit.useWords(kitchenWordsFor);
  const photo = showPhoto && cell.filled && cell.photo && (
    <kit.KitPhoto photo={cell.photo} shape={stackPhoto ? "wide" : "thumb"} part="photo" label={cell.title} />
  );
  const leading = !stackPhoto && photo;
  const title = cell.filled && (
    <kit.KitText part="title" role={compact && !leading ? "caption" : "body"} lines={2}>
      {cell.title}
    </kit.KitText>
  );
  const target = { item: cell.id, goto: cell.goto, label: mealPlanReading("", [cell], lang, agenda)[0]! };
  const meal = words.mealPlanLabels[cell.meal];
  const add = agenda ? words.mealPlanAdd(meal) : words.mealPlanLabels.add;
  return (
    <kit.KitRow {...target} inline leading={!agenda && leading} leadingAlign="row">
      {stackPhoto && photo}
      {cell.filled &&
        (agenda ? (
          <kit.KitContent lead={leading} leadingAlign="row">
            <MatrixLabel label={meal} />
            {title}
          </kit.KitContent>
        ) : leading ? (
          <kit.KitRow inline label={cell.title} children={title} />
        ) : (
          title
        ))}
      {!cell.filled && (
        <kit.KitRow part="add" role="button" label={add} inline>
          <kit.KitText part="title" role="caption" tone="accent" children={add} />
        </kit.KitRow>
      )}
    </kit.KitRow>
  );
}
function DailyKcal({ day, value }: { day: number; value: string }) {
  return <kit.KitTrail part={`kcal_${day + 1}`} kind="badge" tone="text" value={value} />;
}
type MealPlanProps = c.Props<typeof props, typeof meta>;
type MealDayHeader = ReturnType<typeof mealPlanDaysFor>[number] & { badge: ReactNode; header: ReactNode };
type MealAgendaProps = {
  heading: string;
  days: MealDayHeader[];
  rows: Cell[];
  today: ReturnType<typeof mealPlanToday>;
  showPhoto: boolean;
};

function MealPlanDayHeaders(cells: MealPlanProps["cells"], lang?: string): MealDayHeader[] {
  const totals = mealPlanTotals(cells, lang);
  return mealPlanDaysFor(lang).map((day, index) => {
    const value = totals.get(index);
    const badge = value && <DailyKcal day={index} value={value} />;
    const header = <MatrixLabel label={day.short} />;
    return {
      ...day,
      badge,
      header: badge ? (
        <kit.KitContent>
          {header}
          {badge}
        </kit.KitContent>
      ) : (
        header
      ),
    };
  });
}

function MealAgenda({ heading, days, rows, today, showPhoto }: MealAgendaProps) {
  return (
    <kit.KitRow part="meals" label={heading} role="group">
      <kit.KitGrid arrange="rows" list listRowGap="cards">
        {days.map((day, index) => (
          <kit.KitContent key={day.id} group="response">
            <kit.KitRow part={null} label={day.label} inline trailing={day.badge}>
              <kit.KitText
                part={null}
                role="label"
                emphasis="strong"
                tone={day.id === today ? "accent" : "text"}
              >
                {day.label}
              </kit.KitText>
            </kit.KitRow>
            {rows
              .filter((row) => row.day === index)
              .map((cell) => (
                <MealCell key={cell.id} cell={cell} agenda showPhoto={showPhoto} stackPhoto={false} />
              ))}
          </kit.KitContent>
        ))}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

export function MealPlan(input: MealPlanProps) {
  const { week, meals, rows } = input as typeof input & { rows: Cell[] };
  const { lang, words } = kit.useWords(kitchenWordsFor);
  const showPhoto = kit.useVariant("media", meta.variants.media, input.media) !== "none";
  const { state, thing } = kit.usePartContext();
  if (state === "empty")
    return (
      <kit.KitCard part="root">
        <kit.KitEmpty
          part="meals"
          icon="calendar_days"
          {...(!thing ? { title: words.mealPlanEmpty } : {})}
          decorativeIcon
        />
      </kit.KitCard>
    );
  const today = mealPlanToday(week);
  const days = MealPlanDayHeaders(input.cells, lang);
  const stackPhoto = meals.length > 2;
  const columns = meals.map((meal) => ({
    id: meal,
    label: words.mealPlanLabels[meal],
    heading: <MatrixLabel label={words.mealPlanLabels[meal]} />,
    cells: days.map((day, index) => {
      const cell = rows.find((cell) => cell.day === index && cell.meal === meal)!;
      return {
        id: day.id,
        content: <MealCell cell={cell} {...{ stackPhoto, showPhoto }} />,
        compactContent: <MealCell cell={cell} compact {...{ stackPhoto, showPhoto }} />,
      };
    }),
  }));
  const heading = mealPlanWeek(week, lang);
  return (
    <kit.KitCard part="root">
      <kit.KitRow part="week" label={heading}>
        <kit.KitText role="heading" part={null} children={heading} />
      </kit.KitRow>
      {input.style === "day" ? (
        <MealAgenda {...{ heading, days, rows, today, showPhoto }} />
      ) : (
        <kit.KitWeekMatrix
          part="meals"
          orientation="daysDown"
          corner={null}
          fitColumns
          days={days}
          rows={columns}
          today={today}
        />
      )}
    </kit.KitCard>
  );
}
