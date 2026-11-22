import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { savedItemDetails, savedItemGroups } from "../copy";
import { customersWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SavedItems.generated";

// Core first: List/trail value shows a price but cannot add a reusable billable entry with its unit and tax defaults.
export const meta = {
  id: "SavedItems",
  status: "ready",
  group: "content",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The reusable billing item library is stored on the business device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    group: ["none", "sections"],
  },
  variantParts: { "group.sections": { adds: ["category"] } },
  parts: ["root", "status"],
  items: {
    key: "items",
    parts: ["root", "title", "rate", "category", "add", "remove", "add_icon", "remove_icon"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { items: { root: ["press"], add: ["press"], remove: ["press"] } },
  confirmParts: ["remove"],
  live: {
    derive: (input): c.Values => {
      const { group, items } = input as ParsedItems;
      return group === "sections" ? { items: savedItemGroups(items).flatMap(({ rows }) => rows) } : {};
    },
  },
  read: (input, _state, lang, _data, currency): string[] => {
    const { group, items } = input as ParsedItems;
    const { savedItemLabels: copy } = customersWordsFor(lang);
    const details = items.map((row) => {
      const { amount, unit, tax } = savedItemDetails(row, lang, currency);
      return `${row.id} ${amount}${unit}${copy.taxJoin}${tax}`;
    });
    return group === "sections"
      ? [
          ...savedItemGroups(items).map(
            ({ category, rows }) => `${rows[0]!.id} ${category ?? copy.uncategorized}`,
          ),
          ...details,
        ]
      : details;
  },
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  id: c.text(24).meta({ kind: "record_id", max: 24 }),
  title: c.text(32),
  rate: z.number().min(0),
  unit: c.text(12).meta({ kind: "unit", max: 12 }).optional(),
  taxable: z.boolean().default(true),
  category: c.text(16).meta({ kind: "category", max: 16 }).optional(),
});
type ParsedItems = { group: "none" | "sections"; items: z.output<typeof itemProps>[] };
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(itemProps).min(1).max(12),
  })
  .refine(({ items }) => new Set(items.map(({ id }) => id)).size === items.length, {
    path: ["items"],
    message: "Saved billing item ids must be unique",
  });
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const items = c.itemsOf(cast, 3);
  const thing = c.thingOf(cast);
  return {
    items: (items.length ? items : [undefined]).map((item, index) => ({
      id: `rate_${index + 1}`,
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(index, lang),
      rate: 0,
    })),
  };
}

// prettier-ignore
const ledge = { items: [
  { id: "watering", title: "Plant care visit", rate: 32.5, unit: "visit", category: "Care" },
  { id: "repotting", title: "Repotting", rate: 24, unit: "plant", category: "Care" },
  { id: "consultation", title: "Care consultation", rate: 0, taxable: false },
] } satisfies z.input<typeof props>;

// prettier-ignore
export const examples = [
  ledge,
  { group: "sections", items: [
    { id: "park", title: "Park walk", rate: 15, unit: "walk", category: "Dog walking" },
    { id: "leash", title: "Spare leash", rate: 12, category: "Supplies" },
    { id: "river", title: "River walk", rate: 20, unit: "walk", category: "Dog walking" },
  ] },
  { ...ledge, group: "sections" },
  { ...ledge, density: "compact" },
  { ...ledge, surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SavedItems");
export const probes = [
  choose(
    "Keep a library of my preset billable rates, with units and tax defaults, that I can quickly add to the next client estimate",
  ),
  choose(
    "Show my three favorite cafés as tappable name rows with their distance as a value at the right",
    "List",
  ),
  write("Save a reusable billing item called Plant care visit at 32.50 per visit. It is taxable."),
  {
    ...write(
      "Show my saved invoice rates with category headings. Plant care visit is 32.50 per visit in Care, and Potting mix is 8 per bag in Supplies.",
    ),
    variant: { axis: "group", value: "sections" },
  },
  read("Add the saved plant care visit to this invoice", { address: "s1/r1/add", action: "press" }),
] satisfies c.Probe[];

type SavedItemsProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function SavedItemRow({ row, density }: { row: SavedItemsProps["items"][number]; density: c.ThemeDensity }) {
  const { lang, words: { savedItemLabels: copy } } = kit.useWords(customersWordsFor);
  const loading = kit.useComponentState() === "loading";
  const { amount, unit, tax } = savedItemDetails(row, lang, kit.useAppCurrency());
  return <kit.KitRow item={row.id} part={null} label={row.title} density={density} inset="none"
    trailing={loading ? <>
      <kit.KitSkeleton shape="control" kind="quiet" />
      <kit.KitSkeleton shape="control" kind="quiet" />
    </> : <>
      <kit.KitAction kind="quiet" icon="plus" part="add" a11y={copy.add(row.title)} />
      <kit.KitAction kind="quiet" icon="close" part="remove" a11y={copy.remove(row.title)} />
    </>}>
    <kit.KitRow inline density={density} part={loading ? null : "root"} role={loading ? "text" : "button"} label={row.title}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["body", row.title], ["caption", `${amount}${unit}${copy.taxJoin}${tax}`]]} /> : <>
        <kit.KitText part="title" emphasis="strong" density={density}>{row.title}</kit.KitText>
        <kit.KitText part="rate" role="caption" tone="muted" density={density}>
          <kit.KitText part={null} role="number" numberScale="compact" density={density} tabular>{amount}</kit.KitText>
          {unit}{copy.taxJoin}{tax}
        </kit.KitText>
      </>}
    </kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
export function SavedItems({ items, surface, group, density: requested }: SavedItemsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState();
  const { words: { savedItemLabels: copy } } = kit.useWords(customersWordsFor);
  const render = (row: SavedItemsProps["items"][number]) => <SavedItemRow key={row.id} {...{ row, density }} />;
  return <kit.KitCard part="root" padded {...{ surface, density }}>
    {state === "empty" ? <kit.KitEmpty part="status" icon="receipt" decorativeIcon /> :
      state === "success" || state === "error" ?
        <kit.KitEmpty part="status" icon={state === "success" ? "check" : "receipt"} decorativeIcon
          title={copy[state]} tone={state === "success" ? "good" : "neutral"} /> :
      group === "none" ? <kit.KitGrid list arrange="rows" density={density}>{items.map(render)}</kit.KitGrid> :
        <kit.KitGrid list arrange="rows" listRowGap="cards" density={density}>
          {savedItemGroups(items).map(({ category, rows }) => {
            const id = rows[0]!.id, label = category ?? copy.uncategorized;
            return <kit.KitGrid key={id} list arrange="rows" density={density}>
              {state === "loading" ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", label]]} /> :
                <kit.KitText item={id} role="label" tone="muted" part="category">{label}</kit.KitText>}
              {rows.map(render)}
            </kit.KitGrid>;
          })}
        </kit.KitGrid>}
  </kit.KitCard>;
}
