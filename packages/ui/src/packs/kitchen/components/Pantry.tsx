import { z } from "zod";
import {
  detailOf,
  isoDate,
  itemsOf,
  placeholderTitle,
  wordsFor,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
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
  KitRow,
  KitText,
  useComponentState,
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
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Food and dates stored on the device, entered by typing or Camera scan.",
  items: { key: "items", parts: ["root", "name", "qty", "place", "use_by", "used"] },
  parts: ["root"],
  states: ["filled", "empty"],
  confirmParts: ["used"],
  actions: { items: { root: ["press"], used: ["press"] } },
  read: (input, state, lang?: string) =>
    state === "filled" ? pantryReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          name: text(24),
          qty: text(12),
          place: z.enum(["cupboard", "fridge", "freezer"]).meta({ kind: "text" }),
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
export const examples = [
  // Ledge: the plant keeper's household supper.
  {
    items: [
      { name: "Ricotta", qty: "250 g", place: "fridge", useBy: "2026-11-20", goto: "food_details" },
      { name: "Lasagne sheets", qty: "1 box", place: "cupboard", goto: "food_details" },
    ],
  },
  // Trot: breakfast before the walking round.
  {
    items: [
      { name: "Frozen berries", qty: "500 g", place: "freezer", useBy: "2027-02-01", goto: "food_details" },
    ],
  },
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

function PantryFood({ item }: { item: Props<typeof props, typeof meta>["items"][number] }) {
  const { words } = useWords(kitchenWordsFor);
  return (
    <KitContent>
      <KitText part="name" role="body">
        {item.name}
      </KitText>
      <KitText part="qty" role="number" numberScale="compact" tabular>
        {item.qty}
      </KitText>
      <KitText part="place" role="caption" tone="muted">
        {words.pantryPlace(words.pantryLabels[item.place])}
      </KitText>
    </KitContent>
  );
}

export function Pantry({ items }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const {
    words: { pantryLabels },
  } = useWords(kitchenWordsFor);
  if (state === "empty")
    return (
      <KitCard part="root">
        <KitEmpty part="name" decorativeIcon />
      </KitCard>
    );
  const tiles = pantryOrder(items).map((item) => (
    <KitRow key={item.id} item={item.id} label={item.name} goto={item.goto} inline>
      <KitContent>
        {items.length === 1 ? (
          <KitGrid columns={2}>
            <PantryFood item={item} />
            <PantryDate useBy={item.useBy} />
          </KitGrid>
        ) : (
          <KitContent>
            <PantryFood item={item} />
            <KitContent group="response">
              <PantryDate useBy={item.useBy} />
            </KitContent>
          </KitContent>
        )}
        <KitRow part="used" label={pantryLabels.used} role="button" inline>
          <KitText part={null} role="label" tone="accent">
            {pantryLabels.used}
          </KitText>
        </KitRow>
      </KitContent>
    </KitRow>
  ));
  return (
    <KitCard part="root" style="inset" padded>
      {tiles.length === 1 ? tiles : <KitGrid columns={2}>{tiles}</KitGrid>}
    </KitCard>
  );
}
