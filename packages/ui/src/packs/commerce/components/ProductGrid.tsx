import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { productAmounts, productReading } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: Gallery/grid shows photos, not prices, sale badges and a quick add per item.
export const meta = {
  id: "ProductGrid",
  status: "ready",
  group: "content",
  purpose: "Browse products with prices and quickly add the ones you want.",
  pick: "Browse several priced goods with a quick add per product, as photo cards or food menu rows. Not photos without prices (Gallery), timed services (ServiceMenu), or owned things (Things).",
  writeHints: [
    'Use arrange "grid" for two-column product cards. Use "rows" for menu rows with a right-hand photo and optional sub line; omit sub for grid.',
    "Leave density null when only the arrangement is requested; menu rows do not imply a change of spacing.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A product query runs on the device.",
  variants: { density: ["comfortable", "compact"], arrange: ["grid", "rows"] },
  variantParts: { "arrange.rows": { adds: ["sub"] } },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: ["tile", "root", "name", "price", "was", "photo", "badge", "sub", "add", "add_icon"],
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], add: ["press"] }, noGoto: { items: ["add"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { items } = input as { items: z.output<typeof itemProps>[] };
    return items.map((item) => productReading(item, lang));
  },
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  name: c.text(28),
  price: z.number().min(0).multipleOf(0.01),
  was: z.number().min(0).multipleOf(0.01).optional(),
  photo: c.photo,
  badge: c.text(12).optional(),
  sub: c.text(48).optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    items: z.array(itemProps).min(1).max(8),
    ...c.variantProps(meta.variants),
  })
  .refine(({ arrange, items }) => arrange === "rows" || items.every(({ sub }) => sub === undefined), {
    path: ["items"],
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    items: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      price: Number(c.wordsFor(lang).placeholderValue),
      photo: "local:1",
      goto: "detail",
    })),
  };
}

const plants = [
  { name: "Fern pot", price: 12, was: 16, photo: "lib:fern", badge: "Sale", goto: "fern_pot" },
  { name: "Basil planter", price: 10, photo: "lib:basil", goto: "basil_planter" },
];
// prettier-ignore
export const examples = [
  { items: plants },
  { arrange: "rows", items: [
    { ...plants[0]!, sub: "Shade-loving fern" },
    { ...plants[1]!, sub: "Basil for the kitchen" },
  ] },
  { items: [
    { name: "Training bites", price: 5, photo: "local:1", goto: "training_bites" },
    { name: "Trail bag", price: 8, photo: "local:2", goto: "trail_bag" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProductGrid");
export const probes = [
  choose("Browse several goods for sale in two columns with a photo, price, and quick add on each card"),
  choose(
    "Browse a collection of plant photos in a grid, without prices, products or purchase controls",
    "Gallery",
  ),
  write(
    "Make two-column shopping cards for a fern pot at 12, previously 16, and a basil planter at 10. Use lib:fern and lib:basil photos and open the named product pages.",
  ),
  {
    ...write(
      "Show bakery goods in menu rows instead of two columns: a sourdough loaf at 6, slow-fermented wheat, and an almond croissant at 4. Use local:1 and local:2 photos and link the named product pages.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Quickly add the basil planter to my basket without opening its details", {
    address: "p1/r2/add",
    action: "press",
  }),
] satisfies c.Probe[];

type GridProps = c.Props<typeof props, typeof meta>;
type TileProps = {
  item: GridProps["items"][number];
  menu: boolean;
  density: c.ThemeDensity;
  offerSlot: boolean;
};

// prettier-ignore
function ProductTile({ item, menu, density, offerSlot }: TileProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const group = density === "compact" ? "content" : "response";
  const { price, was } = productAmounts(item, lang);
  const photo = <kit.KitPhoto photo={item.photo} shape={menu ? "thumb" : "square"} part="photo" label={item.name} />;
  const add = <kit.KitAction icon="plus" kind="secondary" part="add" action="press" a11y={words.addProduct(item.name)} />;
  const amount = <kit.KitText role="number" numberScale="compact" tabular part="price" {...{ density }}>{price}</kit.KitText>;
  const previous = was && <kit.KitText role="caption" tone="muted" strike part="was" {...{ density }}>{was}</kit.KitText>;
  const badge = item.badge && <kit.KitText role="caption" tone="good" part="badge" {...{ density }}>{item.badge}</kit.KitText>;
  const offer = previous || badge || offerSlot ? <kit.KitText role="caption" part={null} {...{ density }}>
    {previous}{previous && badge ? " " : null}{badge || (!previous && "\u00a0")}
  </kit.KitText> : null;
  const prices = <kit.KitContent {...{ density }}>{amount}{offer}</kit.KitContent>;
  const heading = <kit.KitContent {...{ density }} group={menu ? "content" : group}>
    <kit.KitText role="body" part="name" {...{ density }}>{item.name}</kit.KitText>
    {menu && item.sub && <kit.KitText role="caption" tone="muted" part="sub" {...{ density }}>{item.sub}</kit.KitText>}
    {menu && prices}
  </kit.KitContent>;
  const details = <kit.KitRow goto={item.goto} label={item.name} inline surface="plain" {...{ density }} part="root">
    {menu ? <kit.KitGrid fitLast {...{ density }}>{heading}{photo}</kit.KitGrid> :
      <kit.KitContent {...{ density }}>{photo}{heading}</kit.KitContent>}
  </kit.KitRow>;
  return <kit.KitCard part="tile" padded {...{ density }}>
      {menu ? <kit.KitGrid fitLast {...{ density }}>{details}{add}</kit.KitGrid> :
        <kit.KitContent {...{ density }}>
          {details}
          <kit.KitContent {...{ group, density }}>
            <kit.KitGrid fitLast {...{ density }}>{prices}{add}</kit.KitGrid>
          </kit.KitContent>
        </kit.KitContent>}
  </kit.KitCard>;
}

// prettier-ignore
function ProductSkeleton({ item, menu, density, offerSlot }: TileProps) {
  const { lang } = kit.useWords(commerceWordsFor);
  const group = density === "compact" ? "content" : "response";
  const { price, was } = productAmounts(item, lang);
  const prices = [
    ["number", price, "start", "compact"], ["caption", offerSlot || menu ? was ?? item.badge ?? "\u00a0" : undefined],
  ] satisfies Parameters<typeof kit.KitSkeleton>[0]["content"];
  const control = <kit.KitSkeleton shape="control" kind="secondary" inset="none" />;
  return <kit.KitCard part="tile" padded {...{ density }}>
    {menu ? <kit.KitGrid fitLast {...{ density }}>
      <kit.KitGrid fitLast {...{ density }}>
        <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
          content={[["body", item.name], ["caption", item.sub], ...prices]} />{control}
      </kit.KitGrid>{control}
    </kit.KitGrid> : <kit.KitContent {...{ density }}>
      <kit.KitSkeleton shape="media" aspect="square" inset="none" content={[]} {...{ density }} />
      <kit.KitContent {...{ group, density }}><kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", item.name]]} /></kit.KitContent>
      <kit.KitContent {...{ group, density }}>
        <kit.KitGrid fitLast {...{ density }}>
          <kit.KitSkeleton shape="figure" inset="none" content={prices} {...{ density }} />{control}
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitContent>}
  </kit.KitCard>;
}

// prettier-ignore
export function ProductGrid({ items, arrange: requested, density: spacing }: GridProps) {
  const density = kit.useVariant("density", meta.variants.density, spacing);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, requested);
  const context = kit.usePartContext(), menu = arrange === "rows";
  const { words } = kit.useWords(commerceWordsFor);
  if (context.state === "empty") return <kit.KitCard part="root">
    <kit.KitEmpty icon="shopping_bag" part="empty" decorativeIcon {...(context.thing ? {} : { title: words.emptyProducts })} />
  </kit.KitCard>;
  const Tile = context.state === "loading" ? ProductSkeleton : ProductTile;
  return <kit.KitCard style="cards" part="root" {...{ density }}>
    <kit.KitGrid list listRowGap="cards" {...{ arrange }} density={menu ? density : "comfortable"}>
      {items.map((item, index) => {
        const neighbour = items[index % 2 === 0 ? index + 1 : index - 1];
        const offerSlot = !menu && (item.was !== undefined || !!item.badge || neighbour?.was !== undefined || !!neighbour?.badge);
        return <kit.PartScope key={item.id} {...context} item={item.id}><Tile {...{ item, menu, density, offerSlot }} /></kit.PartScope>;
      })}
    </kit.KitGrid>
  </kit.KitCard>;
}
