import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { dealBadge, dealsReading, offerClock, offerRemaining, productAmounts } from "../copy";
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

    'Use style "deals" for flash-sale cards, claimed per item as a percentage from 0 to 100, and ends plus optional endsAt for the shared deadline. Use was for the previous price to compute a discount, or supply badge text.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A product query runs on the device.",
  variants: { arrange: ["grid", "rows"] },
  variantParts: { "arrange.rows": { adds: ["sub"] } },
  parts: ["root", "empty", "deals_header", "deals", "countdown"],
  // prettier-ignore
  items: { key: "items", parts: ["tile", "root", "name", "price", "was", "photo", "badge", "sub", "add", "add_icon", "claimed", "claim_label", "claim_value", "claim_track"] },
  states: ["filled", "empty", "loading"],
  clocks: [offerClock()],
  actions: { items: { root: ["press"], add: ["press"] }, noGoto: { items: ["add"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? dealsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  name: c.text(28),
  price: z.number().min(0).multipleOf(0.01),
  was: z.number().min(0).multipleOf(0.01).optional(),
  photo: c.photo,
  badge: c.text(12).optional(),
  sub: c.text(48).optional(),
  goto: c.screenId,
  claimed: z.int().min(0).max(100).optional(),
});
// prettier-ignore
export const props = z
  .strictObject({
    items: z.array(itemProps).min(1).max(8),
    style: z.literal("deals").optional(),
    ends: c.isoDate.optional(),
    endsAt: c.clock.optional(),
    ...c.variantProps(meta.variants),
  })
  .refine(({ arrange, items }) => arrange === "rows" || items.every(({ sub }) => sub === undefined), { path: ["items"] })
  .refine(({ style, arrange, items, ends, endsAt }) => style === "deals"
    ? arrange === "grid" && (!endsAt || !!ends)
    : !(ends || endsAt || items.some((item) => item.claimed !== undefined)), { path: ["style"] })
  .overwrite((input) => ({ ...input, has_deadline: input.style === "deals" && !!input.ends }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 3).flatMap((item) => c.titleOf(item, 28, thing) ?? []);
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
  { arrange: "rows", items: [{ ...plants[0]!, sub: "Shade-loving fern" }, { ...plants[1]!, sub: "Basil for the kitchen" }] },
  { items: [
    { name: "Training bites", price: 5, photo: "local:1", goto: "training_bites" },
    { name: "Trail bag", price: 8, photo: "local:2", goto: "trail_bag" },
  ] },
  { style: "deals", ends: "2026-11-23", endsAt: "18:30", items: [{ ...plants[0]!, badge: undefined, claimed: 65 }, { ...plants[1]!, was: 12, claimed: 25 }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProductGrid");
// prettier-ignore
export const probes = [
  choose("Browse several goods for sale in two columns with a photo, price, and quick add on each card"),
  choose("Browse a collection of plant photos in a grid, without prices, products or purchase controls", "Gallery"),
  write("Make two-column shopping cards for a fern pot at 12, previously 16, and a basil planter at 10. Use lib:fern and lib:basil photos and open the named product pages."),
  {
    ...write("Show bakery goods in menu rows instead of two columns: a sourdough loaf at 6, slow-fermented wheat, and an almond croissant at 4. Use local:1 and local:2 photos and link the named product pages."),
    variant: { axis: "arrange", value: "rows" },
  },
  { ...write("Show flash-sale deals with a countdown to 2029-11-30 at 18:30. List one Fern pot, $12 down from $16, 65% claimed. Photo lib:fern links to fern_pot."),
    expectProps: { style: "deals", ends: "2029-11-30", endsAt: "18:30", items: [{ price: 12, was: 16, claimed: 65 }] } },
  read("Quickly add the basil planter to my basket without opening its details", { address: "p1/r2/add", action: "press" }),
] satisfies c.Probe[];

type GridProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
type TileProps = { item: GridProps["items"][number]; menu: boolean; density: c.ThemeDensity; deals: boolean; offerSlot: boolean };

// prettier-ignore
function ProductTile({ item, menu, density, deals, offerSlot }: TileProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const group = density === "compact" ? "content" : "response";
  const { price, was } = productAmounts(item, lang);
  const photo = <kit.KitPhoto photo={item.photo} shape={menu ? "thumb" : "square"} part="photo" label={item.name} />;
  const add = <kit.KitAction icon="plus" kind="secondary" part="add" action="press" a11y={words.addProduct(item.name)} />;
  const amount = <kit.KitText role="number" numberScale="compact" tabular part="price" {...{ density }}>{price}</kit.KitText>;
  const previous = was && <kit.KitText role="caption" tone="muted" strike part="was" {...{ density }}>{was}</kit.KitText>;
  const label = deals ? dealBadge(item, lang) : item.badge;
  const badge = label && <kit.KitText role={deals ? "number" : "caption"} numberScale="compact" tone="good" part="badge" {...{ density }}>{label}</kit.KitText>;
  const offer = previous || badge ? <kit.KitText role="caption" part={null} {...{ density }}>
    {previous}{previous && badge ? (deals ? "\u00a0\u00a0" : " ") : null}{badge}
  </kit.KitText> : null;
  const prices = <kit.KitContent {...{ density }}>{amount}{offer}</kit.KitContent>;
  const heading = <kit.KitContent {...{ density }} rhythm="flush" group={menu ? "content" : group}>
    <kit.KitText role="body" part="name" {...{ density }}>{item.name}</kit.KitText>
    {menu && item.sub && <kit.KitText role="caption" tone="muted" part="sub" {...{ density }}>{item.sub}</kit.KitText>}
    {menu && <kit.KitContent {...{ density }} group="response">{prices}</kit.KitContent>}
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
            <kit.KitGrid fitLast {...{ density }}>{amount}{add}</kit.KitGrid>
            {offer ?? (offerSlot && <kit.KitText role="caption" part={null} {...{ density }}>{"\u00a0"}</kit.KitText>)}
          </kit.KitContent>
          {deals && item.claimed !== undefined && <kit.KitRow part="claimed" inline label={words.claimed}>
            <kit.KitContent {...{ density }}><kit.KitGrid fitLast {...{ density }}>
              <kit.KitText part="claim_label" role="caption" tone="muted">{words.claimed}</kit.KitText>
              <kit.KitText part="claim_value" role="number" numberScale="compact" tabular>{c.percentageLine(item.claimed, lang)}</kit.KitText>
            </kit.KitGrid><kit.KitStepsTrack part="claim_track" style="bar" count={100} at={item.claimed} /></kit.KitContent>
          </kit.KitRow>}
        </kit.KitContent>}
  </kit.KitCard>;
}

// prettier-ignore
function ProductSkeleton({ item, menu, density, deals, offerSlot }: TileProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const group = density === "compact" ? "content" : "response";
  const { price, was } = productAmounts(item, lang);
  const prices = [["number", price, "start", "compact"]] satisfies Parameters<typeof kit.KitSkeleton>[0]["content"];
  const offer = was ?? item.badge;
  const control = <kit.KitSkeleton shape="control" kind="secondary" inset="none" />;
  return <kit.KitCard part="tile" padded {...{ density }}>
    {menu ? <kit.KitGrid fitLast {...{ density }}>
      <kit.KitGrid fitLast {...{ density }}><kit.KitSkeleton shape="figure" inset="none" {...{ density }}
        content={[["body", item.name], ["caption", item.sub], ...prices, ["caption", offer]]} />{control}</kit.KitGrid>{control}
    </kit.KitGrid> : <kit.KitContent {...{ density }}>
      <kit.KitSkeleton shape="media" aspect="square" inset="none" content={[]} {...{ density }} />
      <kit.KitContent {...{ group, density }}><kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", item.name]]} /></kit.KitContent>
      <kit.KitContent {...{ group, density }}>
        <kit.KitGrid fitLast {...{ density }}>
          <kit.KitSkeleton shape="figure" inset="none" content={prices} {...{ density }} />{control}
        </kit.KitGrid>
        {offer ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", offer]]} {...{ density }} /> :
          offerSlot && <kit.KitText role="caption" part={null} {...{ density }}>{"\u00a0"}</kit.KitText>}
      </kit.KitContent>
      {deals && item.claimed !== undefined && <kit.KitSkeleton shape="figure" inset="none" content={[["caption", words.claimed]]} />}
    </kit.KitContent>}</kit.KitCard>;
}

// prettier-ignore
export function ProductGrid(input: GridProps) {
  const { items, arrange: requested, style } = input, deals = style === "deals";
  const density = kit.useKit().density, arrange = kit.useVariant("arrange", meta.variants.arrange, requested);
  const context = kit.usePartContext(), menu = arrange === "rows";
  const { words, lang } = kit.useWords(commerceWordsFor);
  kit.useControlValue(`${context.screen}/${context.component}/$offer`, 0);
  const live = kit.useLiveControls(meta, input) as { remainingMs?: number };
  if (context.state === "empty") return <kit.KitCard part="root"><kit.KitEmpty icon="shopping_bag" part="empty"
    decorativeIcon prominence="body" {...(context.thing ? {} : { title: words.emptyProducts })} /></kit.KitCard>;
  const Tile = context.state === "loading" ? ProductSkeleton : ProductTile, countdown = deals && offerRemaining({ ...input, ...live }, lang);
  return <kit.KitCard style="cards" part="root" {...{ density }}>
    {deals && <kit.KitCard part="deals_header" style="plain" {...{ density }}><kit.KitContent inset="md" {...{ density }}>
      <kit.KitGrid fitLast {...{ density }}>
        <kit.KitLayoutText line={{ role: "title", part: "deals", text: words.deals }} {...{ density }} />
        {countdown && <kit.KitLayoutText line={{ role: "meta", tone: "muted", tabular: true, part: "countdown", text: countdown }} {...{ density }} />}
      </kit.KitGrid>
    </kit.KitContent></kit.KitCard>}
    <kit.KitGrid list listRowGap="cards" {...{ arrange }} density={menu ? density : "comfortable"}>
      {items.map((item, index) => {
        const pair = items[index % 2 === 0 ? index + 1 : index - 1], offerSlot = !menu && (pair?.was !== undefined || !!pair?.badge);
        return <kit.PartScope key={item.id} {...context} item={item.id}><Tile {...{ item, menu, density, deals, offerSlot }} /></kit.PartScope>;
      })}
    </kit.KitGrid></kit.KitCard>;
}
