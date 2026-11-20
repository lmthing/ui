import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { isLowStock, thingCopy, thingsEmpty, thingsReading } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: List/cards cannot adjust owned quantities or flag stock at its minimum.
const maxQuantity = Number.MAX_SAFE_INTEGER;
export const meta = {
  id: "Things",
  status: "ready",
  group: "content",
  purpose: "See what you own, where it is kept and what needs restocking.",
  pick: "Owned or stocked items with editable quantities, storage locations or a per-item low-stock minimum. Not a plain directory of names (List), goods for sale (ProductGrid), food at home (Pantry), or a media library (Library).",
  writeHints: [
    "qty and min are nonnegative whole counts. Low stock means qty is at or below min; never write a low-stock flag. Keep all records when filter is low.",
    'Use arrange "rows" only for a row layout; the default is a photo grid. Leave density null unless asked for different spacing.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Stock and ownership records live on the device.",
  variants: {
    arrange: ["grid", "rows"],
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
  },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: ["tile", "root", "name", "photo", "qty", "where", "value", "low"],
    adjust: {
      "qty.increment": { prop: "qty", delta: 1, min: 0, max: maxQuantity },
      "qty.decrement": { prop: "qty", delta: -1, min: 0, max: maxQuantity },
    },
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], qty: ["increment", "decrement"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? thingsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const item = z.strictObject({
  name: c.text(28),
  photo: c.photo.optional(),
  qty: z.int().nonnegative(),
  min: z.int().nonnegative().optional(),
  where: c.text(24).optional(),
  value: z.number().nonnegative().optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(1).max(12),
    filter: z.enum(["all", "low"]).default("all"),
  })
  .overwrite((value) => ({
    ...value,
    items: value.items.map((row) => ({
      ...row,
      visible: value.filter === "all" || isLowStock(row),
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3).map((row, i) => ({
    name: c.titleOf(row, 28, thing) ?? c.placeholderTitle(i, lang),
    where: c.detailOf(row, 24, thing),
    qty: 0,
    goto: "details",
  }));
  return {
    items: items.length ? items : [{ name: c.placeholderTitle(0, lang), qty: 0, goto: "details" }],
  };
}

// prettier-ignore
export const examples = [
  {
    items: [
      { name: "Terracotta pot", photo: "lib:plants", qty: 2, min: 2, where: "Potting shelf", value: 8, goto: "pots" },
      { name: "Seed tray", photo: "lib:seed_tray", qty: 8, min: 2, where: "Greenhouse", value: 12, goto: "trays" },
    ],
  },
  {
    arrange: "rows",
    density: "compact",
    filter: "low",
    items: [
      { name: "Spare lead", qty: 4, min: 1, goto: "leads" },
      { name: "Waste bag roll", qty: 1, min: 2, where: "Van bin", value: 3, goto: "bags" },
      { name: "Travel bowl", photo: "lib:dogs", qty: 0, min: 1, where: "Kit cupboard", value: 9, goto: "bowls" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Things");
export const probes = [
  choose(
    "Track the gear I own with quantities I can adjust, storage bins and a minimum on each item that flags low stock",
  ),
  choose(
    "Show a tappable directory of three people by name, each linked to their profile. No stock or quantities.",
    "List",
  ),
  write(
    "Track two terracotta pots on the Potting shelf. Flag at two remaining, value 8, photo lib:plants, details at pots.",
  ),
  {
    ...write(
      "Show my owned stock one row per item, not as photo tiles: one spare lead in Van bin, at minimum two, details at leads.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("I found one more terracotta pot. Increase its quantity by one.", {
    address: "t1/r1/qty",
    action: "increment",
  }),
] satisfies c.Probe[];

type ThingsProps = c.Props<typeof props, typeof meta>;
type TileProps = {
  item: ThingsProps["items"][number];
  rows: boolean;
  density: c.ThemeDensity;
};

// prettier-ignore
function ThingTile({ item, rows, density }: TileProps) {
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const { value, low, initials } = thingCopy(item, lang);
  const photo = <kit.KitPhoto part="photo" label={item.name} initials={initials}
    {...(item.photo ? { photo: item.photo } : {})} {...(rows ? { shape: "thumb" } : { aspect: "square" })} />;
  const labels = { less: words.things.less(item.name), more: words.things.more(item.name) };
  const stepper = <kit.KitStepper part="qty" value={item.qty} min={0} max={maxQuantity} labels={labels} />;
  const order = density === "compact" ? "content" : "response";
  return <>
    <kit.KitRow part="root" goto={item.goto} label={item.name} inline density={density}>
      <kit.KitContent density={density} {...(rows ? { lead: photo, leadingAlign: "row" } : {})}>
        {!rows && photo}
        <kit.KitText part="name" role="body" density={density}>{item.name}</kit.KitText>
        {item.where && <kit.KitText part="where" role="caption" tone="muted" density={density}>{item.where}</kit.KitText>}
        {value && <kit.KitText part="value" role="caption" tone="muted" density={density}>{value}</kit.KitText>}
        {low && <kit.KitText part="low" role="caption" tone="warn" density={density}>{low}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>
    <kit.KitContent group={order} density={density}>{stepper}</kit.KitContent>
  </>;
}

// prettier-ignore
function ThingLoading({ item, rows, density }: TileProps) {
  const { lang } = kit.useWords(inventoryWordsFor);
  const { value, low, quantity } = thingCopy(item, lang);
  return <>
    {!rows && <kit.KitSkeleton shape="media" aspect="square" content={[]} inset="none" density={density} />}
    <kit.KitSkeleton shape="figure" lead={rows ? "box" : "none"} inset="none" density={density}
      content={[["body", item.name], ["caption", item.where], ["caption", value], ["caption", low]]} />
    <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
      <kit.KitGrid columns={3} density="compact">
        <kit.KitSkeleton shape="control" kind="secondary" inset="none" />
        <kit.KitSkeleton shape="figure" centered inset="none" content={[["number", quantity, "center", "compact"]]} />
        <kit.KitSkeleton shape="control" kind="secondary" inset="none" />
      </kit.KitGrid>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Things(input: ThingsProps) {
  const context = kit.usePartContext();
  const { lang } = kit.useWords(inventoryWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const items = c.visibleItems<ThingsProps["items"][number]>(meta, input);
  if (context.state === "empty" || items.length === 0)
    return <kit.KitCard part="root" {...{ surface, density }}>
      <kit.KitEmpty part="empty" decorativeIcon {...thingsEmpty(input.filter, lang, context.thing)} />
    </kit.KitCard>;
  const Tile = context.state === "loading" ? ThingLoading : ThingTile;
  return <kit.KitCard part="root" style="cards" density={density}>
    <kit.KitGrid list listRowGap="cards" {...{ arrange, density }}>
      {items.map((item) => (
        <kit.PartScope key={item.id} {...context} item={item.id}>
          <kit.KitCard part="tile" padded {...{ surface, density }}>
            <Tile {...{ item, density }} rows={arrange === "rows"} />
          </kit.KitCard>
        </kit.PartScope>
      ))}
    </kit.KitGrid>
  </kit.KitCard>;
}
