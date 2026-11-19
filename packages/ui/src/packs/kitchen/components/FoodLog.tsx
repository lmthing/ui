import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitMeter,
  KitRow,
  KitText,
  useComponentState,
} from "../../../kit";
import { kitchenWordsFor } from "../lang";
import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  percentLine,
} from "../../../catalog";
import { foodLogGroups, foodLogRead, foodLogTotal, kcalLine, targetLine } from "../copy";
export const meta = {
  id: "FoodLog",
  status: "ready",
  group: "input",
  purpose: "Record foods eaten by meal and see their calories against a daily target.",
  pick: "Today's eaten foods grouped by meal with calories and an add action per meal. Not a plain list (List), plans for the week (MealPlan), or calorie goals alone (Progress).",
  writeHints: [
    "Write calories per food, never meal or day totals. Each meal occurs once. goto is the add-food screen; a database lookup there needs a service.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { add: "service" },
  realPath: "Food entries stored on the device; database lookup for adding food requires a service.",
  items: { key: "rows", parts: ["root", "meal", "name", "kcal", "amount", "add"] },
  parts: ["root", "target", "total", "label", "amount", "empty"],
  states: ["filled", "empty"],
  actions: {
    items: { add: ["press"], root: ["press"] },
    when: { add: { entry: "meal" }, root: { entry: "food" } },
  },
  read: (input, state, lang?: string) =>
    state === "filled" ? foodLogRead(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
const schema = z
  .strictObject({
    meals: z
      .array(
        z.strictObject({
          meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).meta({ kind: "text" }),
          items: z
            .array(
              z.strictObject({
                name: text(28),
                kcal: z.number().min(0).max(10000),
                amount: text(12).optional(),
              }),
            )
            .min(0)
            .max(6),
        }),
      )
      .min(1)
      .max(4),
    target: z.number().min(1).max(20000).optional(),
    goto: screenId,
  })
  .refine((value) => new Set(value.meals.map((meal) => meal.meal)).size === value.meals.length, {
    path: ["meals"],
    message: "Each meal appears once",
  });
const withRows = (value: z.output<typeof schema>) => ({
  ...value,
  rows: value.meals.flatMap((meal) => [
    { entry: "meal" as const, meal: meal.meal, goto: value.goto },
    ...meal.items.map((item) => ({ entry: "food" as const, ...item })),
  ]),
});
export const props = schema.overwrite(withRows) as typeof schema &
  z.ZodType<ReturnType<typeof withRows>, z.input<typeof schema>>;
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 28, thingOf(cast)) ?? placeholderTitle(index, lang),
    kcal: 0,
  }));
  if (!items.length)
    items.push(...[0, 1, 2].map((index) => ({ name: placeholderTitle(index, lang), kcal: 0 })));
  return { meals: [{ meal: "dinner", items }], goto: "details" };
}
export const examples = [
  // Ledge: household supper. Trot: breakfast before the walking round.
  {
    meals: [
      { meal: "dinner", items: [{ name: "Lasagne", kcal: 520, amount: "1 slice" }] },
      { meal: "snack", items: [] },
    ],
    target: 2000,
    goto: "food_add",
  },
  {
    meals: [
      {
        meal: "breakfast",
        items: [
          { name: "Apple porridge", kcal: 310, amount: "1 bowl" },
          { name: "Milk", kcal: 90 },
        ],
      },
      { meal: "lunch", items: [] },
    ],
    goto: "food_add",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("FoodLog");
export const probes = [
  choose("Log what I ate today grouped by meal, with food calories and an add button for each meal"),
  choose(
    "Browse a few ordinary records with short details and links, without meal groups or calorie totals",
    "List",
  ),
  write(
    "Dinner contains one slice of lasagne at 520 kcal, snack is empty, the daily target is 2000 and adding food opens food_add",
  ),
  read("Add another food to dinner", { address: "f1/r1/add", action: "press" }),
  read("Open the logged lasagne entry", { address: "f1/r2", action: "press" }),
] satisfies Probe[];
function FoodLogRow(row: Props<typeof props, typeof meta>["rows"][number], lang: string) {
  const { foodLogLabels } = kitchenWordsFor(lang);
  if (row.entry === "meal") {
    const label = foodLogLabels.meals[row.meal];
    return (
      <KitRow
        key={row.id}
        item={row.id}
        label={label}
        inline
        trailing={
          <KitAction icon="plus" kind="quiet" part="add" goto={row.goto} a11y={foodLogLabels.add(label)} />
        }
      >
        <KitText tone="muted" part="meal" children={label} />
      </KitRow>
    );
  }
  const kcal = kcalLine(row.kcal, lang);
  const trailing = <KitText role="number" numberScale="compact" tabular part="kcal" children={kcal} />;
  return (
    <KitRow key={row.id} item={row.id} label={row.name} role="button" inline trailing={trailing}>
      <KitText part="name">{row.name}</KitText>
      {row.amount && <KitText role="caption" tone="muted" part="amount" children={row.amount} />}
    </KitRow>
  );
}
export function FoodLog({ meals, rows, target }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(kitchenWordsFor);
  const { target: label } = words.foodLogLabels;
  const state = useComponentState();
  const total = foodLogTotal(meals);
  const kcal = kcalLine(total, lang);
  if (state === "empty")
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="empty" decorativeIcon />
      </KitCard>
    );
  return (
    <KitCard style="inset" part="root">
      <KitRow label={kcal}>
        <KitText role="number" tabular part="total" children={kcal} />
        {target !== undefined && (
          <KitText role="caption" tone="muted" part="target" children={targetLine(target, lang)} />
        )}
      </KitRow>
      {target !== undefined && (
        <KitRow label={label}>
          <KitMeter label={label} amount={percentLine(total, target, lang)} ratio={total / target} />
        </KitRow>
      )}
      {foodLogGroups(meals, rows).map((group, index) => (
        <KitContent key={index} inset="md" group={index > 0 ? "response" : "content"}>
          {group.map((row) => FoodLogRow(row, lang))}
        </KitContent>
      ))}
    </KitCard>
  );
}
