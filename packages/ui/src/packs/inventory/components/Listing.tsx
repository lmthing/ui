import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { listingCopy, listingReading } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: Card/plain cannot express an asking period and structured property facts with contact and save.
export const meta = {
  id: "Listing",
  status: "ready",
  group: "content",
  purpose: "Review an offer to rent or buy real estate, then save it or contact the advertiser.",
  pick: "A dwelling actually offered for rent or sale, with beds, baths, floor area or lease terms. For a single notice or any other photo-and-text preview that opens more, choose Card instead. Not a venue to visit (PlaceCard) or goods for sale (Product).",
  writeHints: [
    "Price is a number without a currency, per is month/week for rent and none for sale. Area uses m2 or ft2; photos go in a separate Gallery.",
    'For an ordinary listing with a description, end with "detail":null,"density":null,"surface":null. Keep the supplied about text.',
    'Only an explicit request to hide the description sets "detail":"brief"; keep about in the data. Hiding it does not request density or surface. Set those only for explicit spacing or surface requests.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Listings live on the device; contacting the advertiser requires a service.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "plain"] },
  variantParts: { "detail.brief": { hides: ["about"] } },
  // prettier-ignore
  parts: ["root", "title", "price", "per", "beds", "baths", "area", "area_unit",
    "where", "from", "about", "contact", "contact_label", "save", "save_label", "save_icon"],
  partTiers: { contact: "service" },
  states: ["filled", "loading"],
  actions: { parts: { contact: ["press"], save: ["toggle"] } },
  live: { derive: ({ detail }) => (detail === "brief" ? { about: undefined } : {}) },
  read: (input, state, lang): string[] =>
    state === "filled" ? listingReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  title: c.text(32),
  price: z.number().nonnegative(),
  per: z.enum(["month", "week", "none"]),
  beds: z.int().min(0).max(20),
  baths: z.number().min(0).max(10),
  area: z.number().nonnegative(),
  areaUnit: z.enum(["m2", "ft2"]),
  where: c.text(40),
  from: c.isoDate.optional(),
  about: c.text(160),
  ...c.variantProps(meta.variants),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  const words = c.wordsFor(lang);
  return {
    title: (row && c.titleOf(row, 32, thing)) ?? c.placeholderTitle(0, lang),
    where: (row && c.detailOf(row, 40, thing)) ?? c.clip(words.placeholderLabel, 40),
    about: c.clip(words.placeholderDetail, 160),
    price: 0,
    per: "none",
    beds: 0,
    baths: 0,
    area: 0,
    areaUnit: "m2",
  };
}

export const examples = [
  {
    title: "Flat with a sunny patio",
    price: 950,
    per: "month",
    beds: 2,
    baths: 1,
    area: 64,
    areaUnit: "m2",
    where: "14 Mill Lane",
    from: "2026-12-01",
    about: "South-facing patio with room for potted\u00a0plants.",
  },
  {
    title: "House by the walking trails",
    price: 240000,
    per: "none",
    beds: 3,
    baths: 1.5,
    area: 1020,
    areaUnit: "ft2",
    where: "8 Clover Lane",
    about: "Fenced yard and a covered boot\u2011wash\u00a0area.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Listing");
export const probes = [
  choose(
    "Show a flat offered for rent with monthly asking rent, bedrooms, bathrooms, floor area, address and a way to contact the advertiser",
  ),
  choose(
    "Feature one park notice with a photo, one short description and a tap through to more. No asking price, property facts or enquiry.",
    "Card",
  ),
  write(
    "Advertise Flat with a sunny patio at 14 Mill Lane, 950 per month, two beds, one bath, 64 m2, available 2026-12-01. South-facing patio with room for potted plants.",
  ),
  {
    ...write(
      "Show a house for sale by the walking trails: asking 240000, three beds, one and a half baths, 1020 square feet, 8 Clover Lane. Keep the description 'Fenced yard and a covered boot-wash area' in the record, but don't display it on the listing.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Contact the advertiser about the flat with the sunny patio", {
    address: "l1/contact",
    action: "press",
  }),
] satisfies c.Probe[];

type ListingProps = c.Props<typeof props, typeof meta>;
type ListingCopy = ReturnType<typeof listingCopy>;
type Density = c.ThemeDensity;

// prettier-ignore
function ListingFacts({ copy, unitSpace, density }: { copy: ListingCopy; unitSpace: string; density: Density }) {
  const facts = [
    { part: "beds", icon: "bed", text: copy.beds },
    { part: "baths", icon: "bath", text: copy.baths },
    { part: "area", icon: "home", text: copy.area },
  ] as const;
  return <kit.KitContent density={density}>
    {facts.map(({ part, icon, text }) =>
      <kit.KitContent key={part} leadingAlign="row" lead={<kit.KitIcon name={icon} scale="sm" decorative />} density={density}>
        <kit.KitText part={part} role="label" density={density}>
          {text}{part === "area" && <kit.KitText part="area_unit" role="label" density={density}>{unitSpace}{copy.areaUnit}</kit.KitText>}
        </kit.KitText>
      </kit.KitContent>
    )}
  </kit.KitContent>;
}

// prettier-ignore
function ListingLoading({ input, copy, density }: { input: ListingProps; copy: ListingCopy; density: Density }) {
  const { words: { listing: words } } = kit.useWords(inventoryWordsFor);
  return <>
    <kit.KitSkeleton shape="figure" inset="none" content={[["heading", input.title], ["number", copy.price]]} {...{ density }} />
    <kit.KitContent density={density}>
      {[copy.beds, copy.baths, copy.area + words.unitSpace + copy.areaUnit].map((text, index) =>
        <kit.KitSkeleton key={index} shape="figure" inset="none" lead="dot" content={[["label", text]]} density={density} />
      )}
    </kit.KitContent>
    <kit.KitContent density={density}>
      <kit.KitSkeleton shape="figure" inset="none" content={[["label", input.where], ["label", copy.from], ["label", copy.about]]} {...{ density }} />
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid {...{ density }}>
          <kit.KitSkeleton shape="control" label={words.contact} full />
          <kit.KitSkeleton shape="control" label={words.save} kind="secondary" full />
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Listing(input: ListingProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { screen, component } = kit.usePartContext();
  const saved = kit.useControlValue(`${screen}/${component}/save`, false);
  const { lang, words: { listing: words } } = kit.useWords(inventoryWordsFor);
  const copy = listingCopy({ ...input, detail }, lang);
  return <kit.KitCard padded {...{ density, surface }}>
    {state === "loading" ? <ListingLoading {...{ input, copy, density }} /> : <>
      <kit.KitContent {...{ density }}>
        <kit.KitText part="title" role="heading" {...{ density }}>{input.title}</kit.KitText>
        <kit.KitText part="price" role="number" tabular {...{ density }}>
          {copy.price}{copy.per && <kit.KitText part="per" role="label" tone="muted" {...{ density }}>{words.unitSpace}{copy.per}</kit.KitText>}
        </kit.KitText>
      </kit.KitContent>
      <ListingFacts copy={copy} unitSpace={words.unitSpace} density={density} />
      <kit.KitContent {...{ density }}>
        <kit.KitText part="where" role="label" {...{ density }}>{input.where}</kit.KitText>
        {copy.from && <kit.KitText part="from" role="label" tone="muted" {...{ density }}>{copy.from}</kit.KitText>}
        {copy.about && <kit.KitText part="about" role="label" tone="muted" {...{ density }}>{copy.about}</kit.KitText>}
        <kit.KitContent group="response" density={density}>
          <kit.KitGrid {...{ density }}>
            <kit.KitAction part="contact" label={words.contact} full />
            <kit.KitAction part="save" action="toggle" kind="secondary" icon={saved ? "check" : "bookmark"} label={saved ? words.unsave : words.save} full />
          </kit.KitGrid>
        </kit.KitContent>
      </kit.KitContent>
    </>}
  </kit.KitCard>;
}
