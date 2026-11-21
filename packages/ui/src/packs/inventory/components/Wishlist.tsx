import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { wishCopy, wishReading } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: Checklist/default cannot keep a target price and priority or add a purchase to owned stock.
export const meta = {
  id: "Wishlist",
  status: "ready",
  group: "input",
  purpose: "Prioritize things you want to buy and mark what you acquire.",
  pick: "A personal list of desired purchases with target prices, priority or an acquisition action that adds an owned record. Not simple jobs to tick off (Checklist), gifts guests claim (Registry), or products for sale (ProductGrid).",
  writeHints: [
    "price and target are numeric amounts without a currency. Priority is a whole number from 1 to 3.",
    'If asked to hide the target price, write "detail":"brief" and keep the supplied target; write "surface":null and "density":null unless the person requests those axes. Otherwise use "detail":null unless explicitly requested. Never write "surface":"card" or a named density just to fill an unset field.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Wishes and acquired records live on the device; price tracking would need a service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["target"] } },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: [
      "frame",
      "root",
      "name",
      "photo",
      "price",
      "target",
      "priority",
      "where",
      "trail",
      "got",
      "got_label",
    ],
  },
  confirmParts: ["got"],
  states: ["filled", "empty"],
  actions: { items: { got: ["press"], root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? wishReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z
    .array(
      z.strictObject({
        name: c.text(28),
        photo: c.photo.optional(),
        price: z.number().nonnegative().optional(),
        target: z.number().nonnegative().optional(),
        priority: z.int().min(1).max(3),
        where: c.text(24).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3).map((row, i) => ({
    name: c.titleOf(row, 28, thing) ?? c.placeholderTitle(i, lang),
    where: c.detailOf(row, 24, thing),
    priority: 2,
  }));
  return { items: items.length ? items : [{ name: c.placeholderTitle(0, lang), priority: 2 }] };
}

export const examples = [
  {
    items: [
      {
        name: "Clip-on grow light",
        photo: "lib:plants",
        price: 36,
        target: 25,
        priority: 1,
        where: "Garden Supply",
      },
      { name: "Self-watering pot", target: 18, priority: 2, where: "Seed House" },
    ],
  },
  { items: [{ name: "Reflective lead", priority: 3, where: "Pet shop" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Wishlist");
export const probes = [
  choose(
    "Keep track of things I want to buy with a target price and priority, then move each to my owned items when I get it",
  ),
  choose(
    "Give me three household chores, each with its own tick box and a done or not done state",
    "Checklist",
  ),
  write(
    "I want a clip-on grow light from Garden Supply, currently 36, target 25, priority 1. Photo lib:plants.",
  ),
  {
    ...write(
      "Save my wish for a clip-on grow light from Garden Supply. It costs 36, my target is 25, and it's priority 1. Keep my target price in the record but show only what it costs now.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("I bought the clip-on grow light. Use the acquisition action, not the detail link.", {
    address: "w1/r1/got",
    action: "press",
  }),
] satisfies c.Probe[];

type WishlistProps = c.Props<typeof props, typeof meta>;
type WishRowProps = Pick<WishlistProps, "surface" | "detail"> & {
  row: WishlistProps["items"][number];
  density: c.ThemeDensity;
};

// prettier-ignore
function WishRow({ row, density, surface, detail }: WishRowProps) {
  const scope = kit.usePartContext();
  const { lang, words: { wishlist: words } } = kit.useWords(inventoryWordsFor);
  const { price, target, priority } = wishCopy(row, detail, lang);
  return (
    <kit.PartScope {...scope} item={row.id}>
      <kit.KitCard part="frame" padded label={row.name} {...{ density, surface }}>
        <kit.KitRow part="root" role="button" label={row.name} lineRole="heading" surface="plain" inline density={density}>
          <kit.KitGrid fitLast density={density}>
            <kit.KitContent density={density} lead={<kit.KitIcon part="trail" name="chevron_right" scale="sm" />}>
              <kit.KitText part="name" role="heading" density="comfortable">{row.name}</kit.KitText>
              {row.where && <kit.KitText part="where" role="caption" tone="muted" density={density}>{row.where}</kit.KitText>}
              {price && <kit.KitText part="price" role="label" tone="muted" density={density}>
                {price[0]}<kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>{price[1]}</kit.KitText>
              </kit.KitText>}
              {target && <kit.KitText part="target" role="label" tone="muted" density={density}>
                {target[0]}<kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>{target[1]}</kit.KitText>
              </kit.KitText>}
            </kit.KitContent>
            {row.photo && <kit.KitPhoto part="photo" photo={row.photo} label={row.name} />}
          </kit.KitGrid>
        </kit.KitRow>
        <kit.KitRow part={null} inline surface="plain" label={row.name} lineRole="body" density={density}
          leading={<kit.KitAction part="got" label={words.got} kind="secondary" />} leadingAlign="row">
          <kit.KitRow part={null} inline surface="plain" label={priority} density={density}>
            <kit.KitText part="priority" role="caption" tone="muted" density={density}>{priority}</kit.KitText>
          </kit.KitRow>
        </kit.KitRow>
      </kit.KitCard>
    </kit.PartScope>
  );
}

export function Wishlist(input: WishlistProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  if (state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.KitEmpty part="empty" icon="package" decorativeIcon />
      </kit.KitCard>
    );
  return (
    <kit.KitCard part="root" style="cards" density={density}>
      {input.items.map((row) => (
        <WishRow key={row.id} {...{ row, density, surface, detail }} />
      ))}
    </kit.KitCard>
  );
}
