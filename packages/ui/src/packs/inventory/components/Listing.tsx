import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Card/plain cannot express an asking period and structured property facts with contact and save.
export const meta = {
  id: "Listing",
  status: "draft",
  group: "content",
  purpose: "Review a place for rent or sale, save it or contact the advertiser.",
  pick: "One advertised property with asking price, price period, beds, baths, area and availability. Not a simple preview (Card), a venue (PlaceCard), or a product (Product).",
  writeHints: [
    "Price is a number without a currency, per is month/week for rent and none for sale. Area uses m2 or ft2; photos go in a separate Gallery.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Listings live on the device; contacting the advertiser requires a service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: [
    "root",
    "title",
    "price",
    "per",
    "beds",
    "baths",
    "area",
    "area_unit",
    "where",
    "from",
    "about",
    "contact",
    "save",
  ],
  partTiers: { contact: "service" },
  states: ["filled", "loading"],
  actions: { parts: { contact: ["press"], save: ["toggle"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
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
    about: "South-facing patio with room for potted plants.",
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
    about: "Fenced yard and a covered boot-wash area.",
    density: "compact",
    surface: "plain",
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
  read("Contact the advertiser about the flat with the sunny patio", {
    address: "l1/contact",
    action: "press",
  }),
] satisfies c.Probe[];
