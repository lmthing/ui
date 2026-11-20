import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { placeCardCopy, placeCardReading } from "../copy";
import { placesWordsFor } from "../lang";

// Core first: Card/plain cannot show structured venue rating, price level, open state and distance.
export const meta = {
  id: "PlaceCard",
  status: "ready",
  group: "content",
  purpose: "See whether a venue is open and worth visiting.",
  pick: "One venue to visit with its opening times, distance, rating or price level. Not a compact preview of an ordinary record (Card), several places (List), a product (Product), or a rental (Listing).",
  writeHints: [
    "Supply opening and closing times together or neither. Never write open status or distance; they are computed. Leave photo null when a Gallery already shows the venue.",
    'To hide a supplied photo, keep its reference and write media "none"; this does not change density. Write density null unless the person explicitly asks for compact or comfortable spacing. Leave media null unless the person requests a media treatment.',
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
  live: {}, // Opt into state-aware planning so loading never follows the link.
  deviceData: ["place_details"],
  previewDeviceData: ({ input }) => ({
    place_details: [{ name: input.name, goto: input.goto, localTime: "13:00", distanceKm: 1.2 }],
  }),
  read: (input, state, lang, data): string[] =>
    state === "filled" ? placeCardReading(input as z.output<typeof props>, data, lang) : [],
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
  { name: "Juniper Café", category: "Dog-friendly café", rating: 4.5, goto: "juniper" },
  { ...nursery, media: "none", closes: "13:30" },
  { ...nursery, density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PlaceCard");
export const probes = [
  choose("Show one café to visit with its star rating, price level, distance and whether it's open now"),
  choose(
    "Preview one saved community announcement in the middle of the screen, with a thumbnail and short blurb. Tap to open the full announcement.",
    "Card",
  ),
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

type PlaceCardProps = c.Props<typeof props, typeof meta>;
type PlaceCopy = ReturnType<typeof placeCardCopy>;
type Density = NonNullable<PlaceCardProps["density"]>;
const nameRole = (density: Density) => (density === "compact" ? "title" : "heading");

// prettier-ignore
function VenueDetail({ input, copy, density }: { input: PlaceCardProps; copy: PlaceCopy; density: Density }) {
  const { name, category, rating } = input;
  const { opening, price, distance } = copy;
  const stars = rating === undefined ? undefined : (
    <kit.KitScaleTrack style="stars" value={rating} labels={copy.ratingLabels} readonly compact />
  );
  const score = stars && (
    <kit.KitContent lead={stars} lineRole="body" density={density}>
      <kit.KitText role="number" numberScale="compact" part="rating" tabular lines={1} density={density}>{copy.rating}</kit.KitText>
    </kit.KitContent>
  );
  const badge = opening && (
    <kit.KitTrail part="open_state" kind="badge" value={opening.text} tone={opening.tone} density={density} />
  );
  return (
    <kit.KitContent density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitText role={nameRole(density)} part="name" density={density}>{name}</kit.KitText>
        <kit.KitIcon name="chevron_right" decorative />
      </kit.KitGrid>
      <kit.KitText part="category" tone="muted" density={density}>{category}</kit.KitText>
      {(score || badge || price || distance) && (
        <kit.KitContent density={density}>
          {score && badge ? <kit.KitGrid fitLast density={density}>{score}{badge}</kit.KitGrid> : score || (
            badge && <kit.KitContent lead={badge} leadingAlign="row" density={density}>{null}</kit.KitContent>
          )}
          {(price || distance) && <kit.KitGrid fitLast density={density}>
            {price && <kit.KitText role="label" tone="muted" part="price_level" density={density}>{price}</kit.KitText>}
            {distance && <kit.KitText role="label" tone="muted" part="distance" density={density}>{distance}</kit.KitText>}
          </kit.KitGrid>}
        </kit.KitContent>
      )}
    </kit.KitContent>
  );
}

// prettier-ignore
function VenueLoading({ input, copy, density }: { input: PlaceCardProps; copy: PlaceCopy; density: Density }) {
  const { words } = kit.useWords(placesWordsFor);
  const score = copy.rating && <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[["number", words.ratingSkeleton(copy.rating), "start", "compact"]]} />;
  const badge = copy.opening && <kit.KitTrail part="open_state" kind="badge" value={copy.opening.text} density={density} />;
  return (
    <kit.KitContent density={density}>
      <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[[nameRole(density), input.name], ["body", input.category]]} />
      <kit.KitContent density={density}>
        {score && badge ? <kit.KitGrid fitLast density={density}>{score}{badge}</kit.KitGrid> : score || (
          badge && <kit.KitContent lead={badge} leadingAlign="row" density={density}>{null}</kit.KitContent>
        )}
        {(copy.price || copy.distance) && <kit.KitGrid fitLast density={density}>
          {copy.price && <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy.price]]} />}
          {copy.distance && <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy.distance]]} />}
        </kit.KitGrid>}
      </kit.KitContent>
    </kit.KitContent>
  );
}

export function PlaceCard(input: PlaceCardProps) {
  const { name, goto } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const loading = kit.useComponentState() === "loading";
  const { resolvePhoto } = kit.useKit();
  const { lang } = kit.useWords(placesWordsFor);
  const copy = placeCardCopy(input, kit.useDeviceData(), lang);
  const photo = media === "cover" && input.photo && resolvePhoto?.(input.photo) ? input.photo : undefined;
  return (
    <kit.KitCard part="root" padded density={density} {...(loading ? {} : { goto, label: name })}>
      {photo &&
        (loading ? (
          <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} density={density} />
        ) : (
          <kit.KitPhoto part="photo" shape="wide" photo={photo} label={name} />
        ))}
      {loading ? (
        <VenueLoading input={input} {...{ copy, density }} />
      ) : (
        <VenueDetail input={input} {...{ copy, density }} />
      )}
    </kit.KitCard>
  );
}
