import { z } from "zod";
import * as catalog from "../../../catalog";
import * as kit from "../../../kit";
import * as copy from "../copy";
// Core first: Checklist/default cannot scale numeric ingredient amounts by servings or switch units.
export const meta = {
  id: "Ingredients",
  status: "ready",
  group: "input",
  purpose: "Scale a recipe's grouped ingredient amounts and tick what you have while cooking.",
  pick: "Recipe ingredient amounts with a servings stepper and metric or US switch. Not general tasks (Checklist), food to buy (GroceryList), or stored food (Pantry).",
  writeHints: [
    "Amounts are the seed quantities for the written servings. Never write scaled amounts, conversions, item ids or check states.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Recipe data stored on the device.",
  items: { key: "rows", parts: ["root", "name", "amount", "unit", "note", "have"] },
  parts: ["root", "servings", "value", "controls", "system", "shop"],
  states: ["filled"],
  actions: {
    parts: { servings: ["increment", "decrement"], system: ["select"], shop: ["press"] },
    items: { have: ["check"] },
  },
  read: (input) => copy.ingredientsReading(input as z.output<typeof props>),
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
    servings: z.int().min(1).max(24),
    groups: z.array(z.strictObject({
      label: catalog.text(20).optional(),
      items: z.array(ingredient).min(1).max(16),
    })).min(1).max(3),
    system: z.enum(["metric", "us"]).default("metric"),
  })
  .overwrite((value) => ({
    ...value,
    rows: value.groups.flatMap((group) => group.items.map((item) => ({ ...item, have: false }))),
  }));
export function fallback({ cast }: { cast: catalog.CastLike }): z.input<typeof props> {
  const thing = catalog.thingOf(cast);
  const items = catalog.itemsOf(cast, 3).map((item, index) => ({
    name: catalog.titleOf(item, 28, thing) ?? catalog.placeholderTitle(index),
    note: catalog.detailOf(item, 20, thing),
    unit: "none" as const,
  }));
  return {
    servings: 1,
    groups: [{ items: items.length ? items : [{ name: catalog.placeholderTitle(0), unit: "none" }] }],
  };
}
// prettier-ignore
export const examples = [
  // Ledge: the plant keeper's household supper.
  {
    servings: 4, system: "metric",
    groups: [
      { label: "Sauce", items: [{ name: "Tomatoes", amount: 600, unit: "g", note: "Chopped" }] },
      { label: "Layers", items: [{ name: "Lasagne sheets", amount: 8, unit: "piece" }] },
    ],
  },
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
  read("Increase the recipe servings by one", { address: "i1/servings", action: "increment" }),
  read("Tick that I have the tomatoes", { address: "i1/r1/have", action: "check" }),
] satisfies catalog.Probe[];
type ViewProps = catalog.Props<typeof props, typeof meta> & {
  rows: (z.output<typeof ingredient> & { id: string; have: boolean })[];
};
type RowProps = Pick<ViewProps, "system"> & {
  row: ViewProps["rows"][number];
  scale: number;
};
function IngredientRow({ row, scale, system }: RowProps) {
  const quantity = copy.ingredientAmount(row, scale, system);
  return (
    <kit.KitRow
      item={row.id}
      label={row.name}
      leading={<kit.KitCheck done={row.have} part="have" label={row.name} />}
    >
      <kit.KitText part="name">{row.name}</kit.KitText>
      <kit.KitTrack part="quantity">
        {Object.entries(quantity).map(
          ([part, value]) =>
            value && (
              <kit.KitText
                key={part}
                part={part}
                numberScale="compact"
                role={part === "amount" ? "number" : "label"}
                tone={part === "amount" ? "text" : "muted"}
              >
                {value}
              </kit.KitText>
            ),
        )}
      </kit.KitTrack>
      {row.note && (
        <kit.KitText role="label" tone="muted" part="note">
          {row.note}
        </kit.KitText>
      )}
    </kit.KitRow>
  );
}
function Servings({ value }: { value: number }) {
  const controls = (
    <kit.KitTrack part="controls">
      {copy.servingControls.map((control) => (
        <kit.KitAction
          key={control.action}
          {...control}
          part="servings"
          kind="quiet"
          disabled={value === control.bound}
        />
      ))}
    </kit.KitTrack>
  );
  return (
    <kit.KitRow label={copy.ingredientsLabels.servings} trailing={controls}>
      <kit.KitText role="number" part="value">
        {String(value)}
      </kit.KitText>
      <kit.KitText role="label" tone="muted" part={null}>
        {copy.ingredientsLabels.servings}
      </kit.KitText>
    </kit.KitRow>
  );
}
export function Ingredients({ servings: seed, system: initial, groups, rows }: ViewProps) {
  kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  const address = `${screen}/${component}`;
  const delta = kit.useControlValue(`${address}/servings`, 0);
  const selected = kit.useControlValue<string>(`${address}/system`, initial);
  const system = selected === "us" || selected === copy.ingredientsLabels.us ? "us" : "metric";
  const servings = copy.servingCount(seed, delta);
  let index = 0;
  return (
    <kit.KitCard style="inset" part="root">
      <Servings value={servings} />
      <kit.KitRow label={copy.ingredientsLabels.system}>
        <kit.KitTrack part="system" look="segments" role="radiogroup" label={copy.ingredientsLabels.system}>
          {(["metric", "us"] as const).map((choice) => (
            <kit.KitChip
              key={choice}
              item={null}
              label={copy.ingredientsLabels[choice]}
              on={system === choice}
              role="radio"
              look="segment"
            />
          ))}
        </kit.KitTrack>
      </kit.KitRow>
      {groups.flatMap((group, groupIndex) => [
        group.label && (
          <kit.KitRow key={`group_${groupIndex}`} label={group.label}>
            <kit.KitText role="label" tone="muted" part={null}>
              {group.label}
            </kit.KitText>
          </kit.KitRow>
        ),
        ...group.items.map(() => {
          const row = rows[index++]!;
          return <IngredientRow key={row.id} row={row} scale={servings / seed} system={system} />;
        }),
      ])}
      <kit.KitRow label={copy.ingredientsLabels.shop}>
        <kit.KitAction part="shop" label={copy.ingredientsLabels.shop} kind="secondary" full />
      </kit.KitRow>
    </kit.KitCard>
  );
}
