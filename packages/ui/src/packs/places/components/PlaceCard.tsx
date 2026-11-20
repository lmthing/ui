import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Card/plain cannot show structured venue rating, price level, open state and distance.
export const meta = {
  id: "PlaceCard",
  status: "draft",
  group: "content",
  purpose: "See whether a venue is open and worth visiting.",
  pick: "One venue to visit with its opening times, distance, rating or price level. Not a generic featured story (Card), several places (List), a product (Product), or a rental (Listing).",
  writeHints: [
    "Supply opening and closing times together or neither. Never write open status or distance; they are computed. Leave photo null when a Gallery already shows the venue.",
    'Use media "none" to hide supplied artwork, keeping the photo reference. Leave unrequested axes null.',
  ],
  region: "body",
  weight: 2,
  tier: "ok",
  realPath: "Place details are stored with the app, and distance needs location permission.",
  variants: { density: ["comfortable", "compact"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "photo", "name", "category", "rating", "price_level", "distance", "open_state"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    name: c.text(32),
    category: c.text(20),
    photo: c.photo.optional(),
    rating: z.number().min(0).max(5).optional(),
    priceLevel: z.int().min(1).max(4).optional(),
    opens: c.clock.optional(),
    closes: c.clock.optional(),
    goto: c.screenId,
  })
  .refine(({ opens, closes }) => (opens === undefined) === (closes === undefined), {
    path: ["closes"],
    message: "Give both opening and closing time, or neither",
  })
  .overwrite((value) => (value.media === "none" ? { ...value, photo: undefined } : value));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    name: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    category: (item && c.detailOf(item, 20, thing)) || c.clip(c.wordsFor(lang).placeholderDetail, 20),
    goto: "details",
  };
}

const nursery = {
  name: "Riverside Nursery",
  category: "Garden centre",
  photo: "lib:plants",
  rating: 4.7,
  priceLevel: 2,
  opens: "09:00",
  closes: "18:00",
  goto: "nursery",
};
export const examples = [
  nursery,
  { name: "Juniper Café", category: "Dog-friendly café", rating: 4.5, goto: "juniper", density: "compact" },
  { ...nursery, media: "none" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PlaceCard");
export const probes = [
  choose("Show one café to visit with its star rating, price level, distance and whether it's open now"),
  choose("Feature one community announcement with a headline, photo and short description", "Card"),
  write(
    "Feature Riverside Nursery, a garden centre rated 4.7 at price level 2, open 09:00 to 18:00. Tap to open nursery.",
  ),
  {
    ...write(
      "Riverside Nursery is a garden centre. Keep lib:plants as its photo reference, but do not show the photo. Tap to open nursery.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Open Riverside Nursery", { address: "p1", action: "press" }),
] satisfies c.Probe[];
