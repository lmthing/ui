import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import * as copy from "../copy";
import { kitchenWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-NutritionFacts.generated";

// Core first: KeyValue/arrange:rows displays static facts, not serving-scaled amounts or macro shares.
const { min, max, step } = copy.nutritionBounds;
// prettier-ignore
const allergenParts = ["allergen_1", "allergen_2", "allergen_3", "allergen_4", "allergen_5", "allergen_6"] as const;
export const meta = {
  id: "NutritionFacts",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Calculate from recipe data on the device, or look up the food in an external barcode database.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["nutrients", "allergens", ...allergenParts] } },
  items: { key: "points", parts: ["root", "label"] },
  // prettier-ignore
  parts: ["root", "title", "serving_label", "servings", "calories", "macros", "nutrients", "allergens",
    ...allergenParts, "log", "success"],
  states: ["filled", "empty", "loading", "success"],
  actions: { parts: { servings: ["increment", "decrement"], log: ["press"] } },
  adjust: {
    "servings.increment": { prop: "servings", delta: step, min, max },
    "servings.decrement": { prop: "servings", delta: -step, min, max },
  },
  readSuccess: true,
  read: (input, state, lang) =>
    copy.nutritionReading(input as Parameters<typeof copy.nutritionReading>[0], state, lang),
} as const satisfies c.Meta;
const amount = z.number().min(0).max(copy.nutritionAmountMax);
const nutrient = z.strictObject({
  label: c.text(20),
  amount,
  unit: c.text(8),
  tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
});
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  servingLabel: c.text(24),
  servings: z.number().min(min).max(max).default(1),
  calories: amount, protein: amount, carbs: amount, fat: amount,
  nutrients: z.array(nutrient).min(0).max(8),
  allergens: z.array(c.text(16)).min(0).max(allergenParts.length),
}).overwrite((input) => ({ ...input, points: copy.nutritionMacros.map((macro) => ({ macro })) }));
// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0], thing = c.thingOf(cast);
  return {
    title: (item && c.titleOf(item, 32, thing)) ?? c.placeholderTitle(0, lang),
    servingLabel: (item && c.detailOf(item, 24, thing)) ?? c.wordsFor(lang).placeholderDetail,
    calories: 0, protein: 0, carbs: 0, fat: 0, nutrients: [], allergens: [],
  };
}
// prettier-ignore
const bowl = {
  title: "Lemon chickpea bowl", servingLabel: "1 bowl", servings: 1.5,
  calories: 420, protein: 18, carbs: 52, fat: 16,
  nutrients: [
    { label: "Fiber", amount: 9, unit: "g", tone: "good" },
    { label: "Sugar", amount: 5, unit: "g" },
    { label: "Sodium", amount: 460, unit: "mg", tone: "warn" },
  ],
  allergens: ["Sesame", "Milk"],
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  bowl,
  {
    title: "Peanut butter toast", servingLabel: "1 slice",
    calories: 260, protein: 10, carbs: 28, fat: 12,
    nutrients: [{ label: "Fiber", amount: 4, unit: "g" }],
    allergens: ["Peanuts", "Wheat"],
  },
  { ...bowl, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("NutritionFacts");
// prettier-ignore
export const probes = [
  choose("Let me change the number of servings of this one recipe and see its calories, protein, carbs and fat update."),
  choose("Show the jar's static facts: origin Italy, net weight 300 g, and storage in the refrigerator.", "KeyValue"),
  write("Lemon chickpea bowl: one bowl per serving, 420 calories, 18 g protein, 52 g carbs, 16 g fat, 9 g fiber, and contains sesame. Start with 1.5 servings."),
  {
    ...write(
      "For one bowl of soup with 200 calories, 10 g protein, 25 g carbs, 7 g fat, 5 g fiber and milk, show the serving control, calories and macros. Keep the fiber and milk in the data, but hide nutrient details and allergens.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Increase the portion size.", { address: "n1/servings", action: "increment" }),
  read("Decrease the portion size.", { address: "n1/servings", action: "decrement" }),
  read("Log this portion in my food diary.", { address: "n1/log", action: "press" }),
] satisfies c.Probe[];
type Point = { macro: (typeof copy.nutritionMacros)[number]; id: string };
type ViewProps = c.Props<typeof props, typeof meta> & { points: Point[] };
type ExtrasProps = Pick<ViewProps, "nutrients" | "allergens"> & {
  display: ReturnType<typeof copy.nutritionDisplay>;
  density: c.ThemeDensity;
};

// prettier-ignore
function Extras({ nutrients, allergens, display, density }: ExtrasProps) {
  const { words: { nutritionFacts: words } } = kit.useWords(kitchenWordsFor);
  const loading = kit.useComponentState() === "loading";
  return <>
    {nutrients.length > 0 && <kit.KitContent group="response" density={density}>
      <kit.KitText part="nutrients" role="label" tone="muted" {...(loading && { emphasis: "emphasis" })}>{words.nutrients}</kit.KitText>
      <kit.KitRow part={null} inline label={words.nutrients} leading={<></>}>
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {nutrients.map((row, index) => <kit.KitGrid key={index} fitLast density={density}>
            <kit.KitContent inset="md"><kit.KitText part={null} role="body" {...(loading && { emphasis: "emphasis" })}>{row.label}</kit.KitText></kit.KitContent>
            <kit.KitText part={null} role="number" numberScale="compact" tabular lines={1}
              {...(loading && { emphasis: "strong" })} tone={row.tone === "neutral" ? "text" : row.tone}>
              {display.nutrient(row)}<kit.KitText part={null} role="label" tone="muted">{words.unitSuffix(row.unit)}</kit.KitText>
            </kit.KitText>
          </kit.KitGrid>)}
        </kit.KitGrid>
      </kit.KitRow>
    </kit.KitContent>}
    {allergens.length > 0 && <kit.KitContent group="response" density={density}>
      <kit.KitText part={null} role="label" tone="muted" {...(loading && { emphasis: "emphasis" })}>{words.allergens}</kit.KitText>
      <kit.KitTrack part="allergens" {...(!loading && { label: words.allergens })}>
        {allergens.map((label, index) => <kit.KitTrail key={index} kind="badge" tone="text" part={allergenParts[index]!} value={label} />)}
      </kit.KitTrack>
    </kit.KitContent>}
  </>;
}

// prettier-ignore
export function NutritionFacts(input: ViewProps) {
  const { lang, words: { nutritionFacts: words } } = kit.useWords(kitchenWordsFor);
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { screen, component } = kit.usePartContext();
  const servings = kit.useControlValue(`${screen}/${component}/$adjust/servings`, input.servings);
  const display = copy.nutritionDisplay({ ...input, servings }, lang);
  const points = input.points.map(({ id, macro }) => ({ id, ...display.macro(macro) }));
  const basis = words.servingBasis(input.servingLabel);
  const servingLabel = <kit.KitText part="serving_label" role="label" tone="muted">{basis}</kit.KitText>;
  const extras = detail === "full" && <Extras {...input} {...{ display, density }} />;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="title" decorativeIcon />
      : state === "loading" ? <>
        <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", input.title]]} />
        <kit.KitGrid density={density}>
          <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.calories], ["number", display.calories]]} />
          <kit.KitContent>
            <kit.KitSkeleton shape="figure" inset="none" content={[["label", basis]]} />
            <kit.KitGrid columns={3} fitLast density={density}>
              <kit.KitSkeleton shape="control" />
              <kit.KitSkeleton shape="figure" inset="none" content={[["number", c.numberLine(servings, lang), "center", "compact"]]} />
              <kit.KitSkeleton shape="control" />
            </kit.KitGrid>
          </kit.KitContent>
        </kit.KitGrid>
        <kit.KitSkeleton shape="bars" share points={points} title={words.macros} density={density} />
        {extras}
        <kit.KitContent group="response"><kit.KitSkeleton shape="control" label={words.log} full /></kit.KitContent>
      </> : <>
        <kit.KitText part="title" role="body" emphasis="strong">{input.title}</kit.KitText>
        {state === "success" ? <kit.KitContent>
          {servingLabel}
          <kit.KitText part="success" role="title" tone="good">{words.success}</kit.KitText>
        </kit.KitContent> : <>
          <kit.KitGrid density={density}>
            <kit.KitContent>
              <kit.KitText part={null} role="label" tone="muted">{words.calories}</kit.KitText>
              <kit.KitText part="calories" role="number" tabular density={density}>{display.calories}</kit.KitText>
            </kit.KitContent>
            <kit.KitContent>
              {servingLabel}
              <kit.KitStepper part="servings" value={servings} {...{ min, max }} labels={words} />
            </kit.KitContent>
          </kit.KitGrid>
          <kit.KitContent group="response" density={density}>
            <kit.KitText part="macros" role="label" tone="muted">{words.macros}</kit.KitText>
            <kit.KitShare points={points} percentOf={display.percent} />
          </kit.KitContent>
          {extras}
          <kit.KitContent group="response" density={density}>
            <kit.KitAction part="log" label={words.log} full />
          </kit.KitContent>
        </>}
      </>}
  </kit.KitCard>;
}
