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
  useVariant,
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
  variantProps,
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
    'To hide portions, set detail to "brief", but keep amount in the data. Write null for density unless explicitly asked for spacing; hiding portions does not change density.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { add: "service" },
  realPath: "Food entries stored on the device; database lookup for adding food requires a service.",
  items: { key: "rows", parts: ["root", "meal", "name", "kcal", "amount", "add"] },
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["amount"] } },
  parts: ["root", "target", "total", "label", "amount", "empty"],
  states: ["filled", "empty"],
  actions: {
    items: { add: ["press"], root: ["press"] },
    when: { add: { entry: "meal" }, root: { entry: "food" } },
  },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? foodLogRead(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
const schema = z
  .strictObject({
    ...variantProps(meta.variants),
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
// prettier-ignore
export const examples = [
  // Ledge: household supper. Trot: breakfast before the walking round.
  {
    meals: [{ meal: "dinner", items: [{ name: "Lasagne", kcal: 520, amount: "1 slice" }] }, { meal: "snack", items: [] }],
    target: 2000, goto: "food_add",
  },
  {
    density: "compact", goto: "food_add",
    meals: [
      { meal: "breakfast", items: [{ name: "Apple porridge", kcal: 310, amount: "1 bowl" }, { name: "Milk", kcal: 90 }] },
      { meal: "lunch", items: [] },
    ],
  },
  { detail: "brief", goto: "food_add", meals: [
    { meal: "breakfast", items: [{ name: "Apple porridge", kcal: 310, amount: "1 bowl" }, { name: "Milk", kcal: 90 }] },
    { meal: "lunch", items: [] },
  ] },
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
  {
    ...write(
      "Log dinner: one slice of lasagne at 520 kcal, with food_add for additions. Keep the portion in the data but hide portions on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add another food to dinner", { address: "f1/r1/add", action: "press" }),
  read("Open the logged lasagne entry", { address: "f1/r2", action: "press" }),
] satisfies Probe[];
type FoodLogProps = Props<typeof props, typeof meta>;
type Finish = { density: "comfortable" | "compact" };
// prettier-ignore
function FoodLogRow(row: FoodLogProps["rows"][number], lang: string, detail: FoodLogProps["detail"], finish: Finish) {
  const { foodLogLabels } = kitchenWordsFor(lang);
  if (row.entry === "meal") {
    const label = foodLogLabels.meals[row.meal];
    return (
      <KitRow key={row.id} item={row.id} label={label} inline {...finish}
        trailing={<KitAction icon="plus" kind="quiet" part="add" goto={row.goto} a11y={foodLogLabels.add(label)} />}>
        <KitText tone="muted" part="meal" {...finish} children={label} />
      </KitRow>
    );
  }
  const kcal = kcalLine(row.kcal, lang);
  const trailing = <KitText role="number" numberScale="compact" tabular part="kcal" {...finish} children={kcal} />;
  return (
    <KitRow key={row.id} item={row.id} label={row.name} role="button" inline trailing={trailing} {...finish}>
      <KitText part="name" {...finish}>{row.name}</KitText>
      {detail === "full" && row.amount && <KitText role="caption" tone="muted" part="amount" {...finish} children={row.amount} />}
    </KitRow>
  );
}
export function FoodLog(input: FoodLogProps) {
  const { meals, rows, target } = input;
  const finish = { density: useVariant("density", meta.variants.density, input.density) };
  const detail = useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words } = useWords(kitchenWordsFor);
  const label = words.foodLogLabels.target;
  const state = useComponentState();
  const total = foodLogTotal(meals),
    kcal = kcalLine(total, lang);
  const goal = target === undefined ? undefined : targetLine(target, lang);
  if (state === "empty")
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="empty" decorativeIcon />
      </KitCard>
    );
  return (
    <KitCard style="inset" part="root">
      <KitRow label={kcal} {...finish}>
        <KitText role="number" tabular part="total" {...finish} children={kcal} />
        {goal && <KitText role="caption" tone="muted" part="target" {...finish} children={goal} />}
      </KitRow>
      {target !== undefined && (
        <KitRow label={label} {...finish}>
          <KitMeter label={label} amount={percentLine(total, target, lang)} ratio={total / target} />
        </KitRow>
      )}
      {foodLogGroups(meals, rows).map((group, index) => (
        <KitContent key={index} inset="md" group={index > 0 ? "response" : "content"}>
          {group.map((row) => FoodLogRow(row, lang, detail, finish))}
        </KitContent>
      ))}
    </KitCard>
  );
}
