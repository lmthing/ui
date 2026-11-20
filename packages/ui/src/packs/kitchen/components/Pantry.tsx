import { z } from "zod";
import {
  detailOf,
  isoDate,
  itemVariantProps,
  itemsOf,
  placeholderTitle,
  wordsFor,
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
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitText,
  useComponentState,
  useVariant,
  useWords,
} from "../../../kit";
import { pantryDates, pantryOrder, pantryReading } from "../copy";
import { kitchenWordsFor } from "../lang";
// Core first: List/cards cannot order food by use-by date or expose a confirmed used-up removal.
export const meta = {
  id: "Pantry",
  status: "ready",
  group: "data",
  purpose: "Know what food is stored at home and what needs using soon.",
  pick: "Food in the cupboard, fridge and freezer with quantities and use-by dates. Not ordinary things to browse (List), things owned generally (Things), or groceries to buy (GroceryList).",
  writeHints: [
    "Write stored useBy dates, never expiry status, tones or sorted ranks. Dates and today's clock determine those.",
    'If asked to hide storage locations, set detail to "brief" and keep place in the data. Always write mark null unless the user explicitly asks to highlight a specific item; quantities and expiry dates are not a request to highlight.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Food and dates stored on the device, entered by typing or Camera scan.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["place"] } },
  items: {
    key: "items",
    parts: ["root", "name", "qty", "place", "use_by", "used"],
    variants: { mark: ["none", "highlight"] },
  },
  parts: ["root"],
  states: ["filled", "empty"],
  confirmParts: ["used"],
  actions: { items: { root: ["press"], used: ["press"] } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? pantryReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    items: z
      .array(
        z.strictObject({
          ...itemVariantProps(meta.items.variants),
          name: text(24),
          qty: text(12),
          place: z.enum(["cupboard", "fridge", "freezer"]),
          useBy: isoDate.optional(),
          goto: screenId,
        }),
      )
      .min(1)
      .max(20),
  })
  .overwrite((value) => ({
    ...value,
    // The destructive part must not inherit the item's details navigation.
    items: value.items.map((item) => ({ ...item, use_by: item.useBy, used: {} })),
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderValue } = wordsFor(lang);
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index, lang),
    qty: detailOf(item, 12, thing) ?? placeholderValue,
    place: "cupboard" as const,
    goto: "details",
  }));
  return {
    items: items.length
      ? items
      : [{ name: placeholderTitle(0, lang), qty: placeholderValue, place: "cupboard", goto: "details" }],
  };
}
// prettier-ignore
const berries = { name: "Frozen berries", qty: "500 g", place: "freezer", useBy: "2027-02-01", goto: "food_details" } as const;
const oats = { name: "Oats", qty: "1 bag", place: "cupboard", goto: "food_details" } as const;
// prettier-ignore
export const examples = [
  { items: [
    { name: "Ricotta", qty: "250 g", place: "fridge", useBy: "2026-11-20", goto: "food_details" },
    { name: "Lasagne sheets", qty: "1 box", place: "cupboard", goto: "food_details" },
  ] },
  { items: [{ ...berries, mark: "highlight" }, oats] },
  { items: [berries, oats] },
  { detail: "brief", items: [berries, oats] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Pantry");
export const probes = [
  choose(
    "Show the food in my fridge, freezer and cupboard, quantities and use-by dates, with a used-up removal",
  ),
  choose(
    "Browse three ordinary things with short details and a link for each, without storage or expiry dates",
    "List",
  ),
  write(
    "My pantry has 250 g ricotta in the fridge, use by 2026-11-20, and one box of lasagne sheets in the cupboard; both open food_details",
  ),
  {
    ...write(
      "Show 250 g ricotta, use by 2026-11-20, opening food_details. Keep fridge as its storage location in the data but don't show storage locations.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the ricotta as used up", { address: "p1/r1/used", action: "press" }),
] satisfies Probe[];
function PantryDate({ useBy }: { useBy?: string | undefined }) {
  const { lang } = useWords(kitchenWordsFor);
  const expiry = pantryDates(useBy, undefined, lang);
  return (
    <KitRow {...(useBy ? { part: "use_by" } : {})} label={expiry.label} inline>
      <KitContent>
        <KitText part={null} role="caption" tone={expiry.tone}>
          {expiry.label}
        </KitText>
        <KitText part={null} role="caption" tone={expiry.tone} tabular>
          {expiry.date}
        </KitText>
      </KitContent>
    </KitRow>
  );
}

type PantryProps = Props<typeof props, typeof meta>;
// prettier-ignore
function PantryFood({ item, detail }: { item: PantryProps["items"][number]; detail: PantryProps["detail"] }) {
  const { words } = useWords(kitchenWordsFor);
  return (
    <KitRow label={item.name} inline lineRole="label" density="compact"
      trailing={<KitIcon name="chevron_right" scale="sm" decorative />}>
      <KitText part="name" role="label" density="compact" tone={item.mark === "highlight" ? "accent" : "text"}>
        {item.name}
      </KitText>
      <KitText part="qty" role="number" numberScale="compact" tabular children={item.qty} />
      {detail === "full" && (
        <KitText part="place" role="caption" tone="muted">
          {words.pantryPlace(words.pantryLabels[item.place])}
        </KitText>
      )}
    </KitRow>
  );
}

// prettier-ignore
export function Pantry({ items, detail: choice }: PantryProps) {
  const state = useComponentState();
  const detail = useVariant("detail", meta.variants.detail, choice);
  const { words: { pantryLabels } } = useWords(kitchenWordsFor);
  if (state === "empty") return <KitCard part="root"><KitEmpty part="name" decorativeIcon /></KitCard>;
  const tiles = pantryOrder(items).map((item) => (
    <KitRow key={item.id} item={item.id} part={null} label={item.name} inline>
      <KitContent>
        <KitRow part="root" label={item.name} goto={item.goto} inline>
          {items.length === 1 ? (
            <KitGrid columns={2}><PantryFood {...{ item, detail }} /><PantryDate useBy={item.useBy} /></KitGrid>
          ) : (
            <KitContent>
              <PantryFood {...{ item, detail }} />
              <KitContent group="response"><PantryDate useBy={item.useBy} /></KitContent>
            </KitContent>
          )}
        </KitRow>
        <KitRow part="used" label={pantryLabels.used} role="button" inline
          lineRole="label" leading={<KitIcon name="trash" scale="sm" tone="bad" decorative />}>
          <KitText part={null} role="label" tone="muted">{pantryLabels.used}</KitText>
        </KitRow>
      </KitContent>
    </KitRow>
  ));
  return <KitCard part="root" style="inset" padded>
    {tiles.length === 1 ? tiles : <KitGrid columns={2} density="compact">{tiles}</KitGrid>}
  </KitCard>;
}
