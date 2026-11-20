import { z } from "zod";
import * as catalog from "../../../catalog";
import * as kit from "../../../kit";
import * as copy from "../copy";
import { kitchenWordsFor } from "../lang";
// Core first: Checklist/default cannot scale numeric ingredient amounts by servings or switch units.
export const meta = {
  id: "Ingredients",
  status: "ready",
  group: "input",
  purpose: "Scale a recipe's grouped ingredient amounts and tick what you have while cooking.",
  pick: "Recipe ingredient amounts with a servings stepper and metric or US switch. Not general tasks (Checklist), food to buy (GroceryList), or stored food (Pantry).",
  writeHints: [
    "Amounts are the seed quantities for the written servings. Never write scaled amounts, conversions, item ids or check states.",
    'If asked to hide preparation notes, set detail to "brief" and keep notes in the data. Otherwise leave detail null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Recipe data stored on the device.",
  items: { key: "rows", parts: ["root", "name", "amount", "unit", "note", "have"] },
  parts: ["root", "servings", "servings_less", "value", "controls", "system", "shop"],
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  states: ["filled"],
  actions: {
    parts: { servings: ["increment"], servings_less: ["decrement"], system: ["select"], shop: ["press"] },
    items: { have: ["check"] },
  },
  adjust: {
    "servings.increment": { prop: "servingsShown", delta: 1, max: 24 },
    "servings_less.decrement": { prop: "servingsShown", delta: -1, min: 1 },
  },
  read: (input, _state, lang?: string): string[] =>
    copy.ingredientsReading(input as Parameters<typeof copy.ingredientsReading>[0], lang),
} as const satisfies catalog.Meta;
const ingredient = z.strictObject({
  name: catalog.text(28),
  amount: z.number().min(0).max(100000).optional(),
  unit: z.enum(["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece", "pinch", "none"]).default("none"),
  note: catalog.text(20).optional(),
});
// prettier-ignore
export const props = z
  .strictObject({
    ...catalog.variantProps(meta.variants),
    servings: z.int().min(1).max(24),
    groups: z.array(z.strictObject({
      label: catalog.text(20).optional(),
      items: z.array(ingredient).min(1).max(16),
    })).min(1).max(3),
    system: z.enum(["metric", "us"]).default("metric"),
  })
  .overwrite((value) => ({
    ...value,
    servingsShown: value.servings,
    rows: value.groups.flatMap((group) => group.items.map((item) => ({ ...item, have: false }))),
  }));
export function fallback({ cast, lang }: catalog.FallbackInput): z.input<typeof props> {
  const thing = catalog.thingOf(cast);
  const items = catalog.itemsOf(cast, 3).map((item, index) => ({
    name: catalog.titleOf(item, 28, thing) ?? catalog.placeholderTitle(index, lang),
    note: catalog.detailOf(item, 20, thing),
    unit: "none" as const,
  }));
  return {
    servings: 1,
    groups: [{ items: items.length ? items : [{ name: catalog.placeholderTitle(0, lang), unit: "none" }] }],
  };
}
// prettier-ignore
const supper = { servings: 4, system: "metric", groups: [
  { label: "Sauce", items: [{ name: "Tomatoes", amount: 600, unit: "g", note: "Chopped" }] },
  { label: "Layers", items: [{ name: "Lasagne sheets", amount: 8, unit: "piece", note: "Oven ready" }] },
] } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  supper, { ...supper, detail: "brief" },
  // Trot: breakfast before the walking round.
  {
    servings: 2, system: "us",
    groups: [{ items: [
      { name: "Oats", amount: 1, unit: "cup" },
      { name: "Milk", amount: 0.5, unit: "cup" },
      { name: "Cinnamon", unit: "pinch" },
    ] }],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = catalog.probesFor("Ingredients");
export const probes = [
  choose("Scale the grouped ingredients in my recipe from four servings to six and tick what I have"),
  choose("Tick off three household jobs, without quantities or serving controls", "Checklist"),
  write(
    "A four-serving lasagne with sauce: 600 g tomatoes, and layers: eight lasagne sheets; use metric units",
  ),
  {
    ...write(
      "Show ingredients for four servings: 600 g tomatoes, chopped. Keep Chopped as a preparation note but hide notes on the screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Increase the recipe servings by one", { address: "i1/servings", action: "increment" }),
  read("Tick that I have the tomatoes", { address: "i1/r1/have", action: "check" }),
] satisfies catalog.Probe[];
type ViewProps = catalog.Props<typeof props, typeof meta> & {
  rows: (z.output<typeof ingredient> & { id: string; have: boolean })[];
  servingsShown?: number;
};
type RowProps = Pick<ViewProps, "system" | "detail"> & {
  row: ViewProps["rows"][number];
  scale: number;
};
function IngredientRow({ row, scale, system, detail }: RowProps) {
  const { lang } = kit.useWords(kitchenWordsFor);
  const quantity = copy.ingredientAmount(row, scale, system, lang);
  return (
    <kit.KitRow
      item={row.id}
      label={row.name}
      inline
      leading={<kit.KitCheck done={row.have} part="have" label={row.name} />}
    >
      <kit.KitText part="name">{row.name}</kit.KitText>
      <kit.KitTrack part={quantity.unit ? "unit" : "quantity"}>
        {quantity.amount && (
          <kit.KitText role="number" numberScale="compact" part="amount">
            {quantity.amount}
          </kit.KitText>
        )}
        {quantity.unit && (
          <kit.KitText role="label" tone="muted" part={null}>
            {quantity.unit}
          </kit.KitText>
        )}
      </kit.KitTrack>
      {detail === "full" && row.note && (
        <kit.KitText role="label" tone="muted" part="note">
          {row.note}
        </kit.KitText>
      )}
    </kit.KitRow>
  );
}
// prettier-ignore
function Servings({ value, brief }: { value: number; brief: boolean }) {
  const { lang, words } = kit.useWords(kitchenWordsFor);
  const { ingredientsLabels } = words;
  const count = <kit.KitText role="number" part="value" children={catalog.numberLine(value, lang)} />;
  const label = <kit.KitText role="label" tone="muted" part={null} children={ingredientsLabels.servings} />;
  const controls = <kit.KitTrack part="controls">
    {!brief && count}
    {copy.servingControls.map(({ label, ...control }) => (
      <kit.KitAction key={control.action} {...control} a11y={ingredientsLabels[label]}
        kind="quiet" disabled={value === control.bound} />
    ))}
  </kit.KitTrack>;
  return (
    <kit.KitRow label={ingredientsLabels.servings} {...(brief ? { density: "compact" as const } : {})}>
      {brief ? <kit.KitGrid fitLast><kit.KitContent>{count}{label}</kit.KitContent>{controls}</kit.KitGrid> : <>{controls}{label}</>}
    </kit.KitRow>
  );
}
// prettier-ignore
export function Ingredients({ servings: seed, servingsShown = seed, system: initial, groups, rows, detail: choice }: ViewProps) {
  kit.useComponentState();
  const detail = kit.useVariant("detail", meta.variants.detail, choice);
  const { words } = kit.useWords(kitchenWordsFor);
  const { ingredientsLabels } = words;
  const { screen, component } = kit.usePartContext();
  const address = `${screen}/${component}`;
  const servings = kit.useControlValue(`${address}/$adjust/servingsShown`, servingsShown);
  const selected = kit.useControlValue<string>(`${address}/system`, initial);
  const system = selected === "us" || selected === copy.ingredientsLabels.us ? "us" : "metric";
  let index = 0;
  return (
    <kit.KitCard style="inset" part="root">
      <Servings value={servings} brief={detail === "brief"} />
      <kit.KitRow label={ingredientsLabels.system}>
        <kit.KitTrack part="system" look="segments" role="radiogroup" label={ingredientsLabels.system}>
          {(["metric", "us"] as const).map((choice) => <kit.KitChip key={choice} item={null} label={ingredientsLabels[choice]} value={copy.ingredientsLabels[choice]} on={system === choice} role="radio" look="segment" />)}
        </kit.KitTrack>
      </kit.KitRow>
      {groups.map((group, groupIndex) => (
        <kit.KitContent key={`group_${groupIndex}`} inset="md" group="response">
          {group.label && <kit.KitText role="label" tone="muted" part={null} children={group.label} />}
          <kit.KitGrid arrange="rows" list={detail === "brief"} listRowGap="group">
            {group.items.map(() => {
              const row = rows[index++]!;
              return <IngredientRow key={row.id} row={row} scale={servings / seed} {...{ system, detail }} />;
            })}
          </kit.KitGrid>
        </kit.KitContent>
      ))}
      <kit.KitRow label={ingredientsLabels.shop}>
        <kit.KitAction part="shop" label={ingredientsLabels.shop} kind="secondary" full />
      </kit.KitRow>
    </kit.KitCard>
  );
}
