import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { placeCardCopy, placeCardReading } from "../copy";
import { placesWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-PlaceCard.generated";

// Core first: Card/plain cannot show structured venue rating, price level, open state and distance.
export const meta = {
  id: "PlaceCard",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "ok",
  realPath: "Place details are stored with the app, and distance needs location permission.",
  variants: { media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  // prettier-ignore
  parts: ["root", "photo", "name", "category", "rating", "price_level", "distance", "open_state", "badge", "save", "unit"],
  states: ["filled", "loading"],
  partTiers: { save: "phone", unit: "phone" },
  actions: {
    parts: { root: ["press"], save: ["toggle"], unit: ["select"] },
    when: { save: { saveEnabled: true }, unit: { unitEnabled: true } },
  },
  selections: { unit: { prop: "distanceUnit", choices: ["km", "mi"], runtime: true } },
  // prettier-ignore
  live: { derive: ({ saved, unit, distanceUnit }) => ({
    saveEnabled: typeof saved === "boolean", unitEnabled: unit !== undefined,
    distanceUnit: unit === undefined ? undefined : distanceUnit ?? unit,
  }) },
  deviceData: ["place_details"],
  previewDeviceData: ({ input }) => ({
    place_details: [{ name: input.name, goto: input.goto, localTime: "13:00", distanceKm: 1.2 }],
  }),
  read: (input, state, lang, data): string[] =>
    state === "filled" ? placeCardReading(input as Parameters<typeof placeCardReading>[0], data, lang) : [],
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
    badge: c.text(14).optional(),
    saved: z.boolean().optional(),
    unit: z.enum(["km", "mi"]).optional(),
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

// prettier-ignore
const nursery = { name: "Riverside Nursery", category: "Garden centre", photo: "lib:plants",
  rating: 4.7, priceLevel: 2, opens: "09:00", closes: "18:00", goto: "nursery" };
export const examples = [
  nursery,
  { name: "Juniper Café", category: "Dog-friendly café", rating: 4.5, goto: "juniper" },
  { ...nursery, media: "none", closes: "13:30" },
  { ...nursery, badge: "Member deal", saved: false, unit: "mi" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PlaceCard");
// prettier-ignore
export const probes = [
  choose("Show one café to visit with its star rating, price level, distance and whether it's open now"),
  choose("Feature one community announcement with a headline and short teaser. Tap the whole preview to open the full announcement. No photos, video, or audio.", "Card"),
  write("Feature Riverside Nursery, a garden centre rated 4.7 at price level 2, open 09:00 to 18:00. Tap to open nursery."),
  {
    ...write("Riverside Nursery is a garden centre. Keep lib:plants as its photo reference, but do not show the photo. Tap to open nursery."),
    variant: { axis: "media", value: "none" },
  },
  read("Open Riverside Nursery", { address: "p1", action: "press" }),
  { ...write("Feature Riverside Nursery, a garden centre. Open nursery on tap and add the badge Member deal."), expectProps: { badge: "Member deal" } },
  { ...write("Feature Riverside Nursery, a garden centre that opens nursery on tap. Show a save button, but the venue is not saved yet."), expectProps: { saved: false } },
  { ...write("Feature Riverside Nursery, a garden centre that opens nursery on tap. Let me switch distance units and start in miles."), expectProps: { unit: "mi" } },
  read("Save Riverside Nursery without opening it", { address: "p1/save", action: "toggle" }, 3),
  read("Switch the distance at Riverside Nursery to kilometres", { address: "p1/unit", action: "select" }, 3),
] satisfies c.Probe[];

type PlaceCardProps = c.Props<typeof props, typeof meta>;
type PlaceCopy = ReturnType<typeof placeCardCopy>;
type Density = c.ThemeDensity;
const nameRole = (density: Density) => (density === "compact" ? "title" : "heading");
// prettier-ignore
function VenueDetail({ input, copy, density, thumb }: { input: PlaceCardProps; copy: PlaceCopy; density: Density; thumb?: string | undefined }) {
  const { name, category, badge } = input;
  const { ratingReading, opening, price, distance } = copy;
  const lineRole = nameRole(density);
  const chevron = <kit.KitIcon name="chevron_right" scale="sm" decorative />;
  const trailer = badge ? <kit.KitRow part={null} inline fitContent label={name} {...{ lineRole, density }}
    leading={<kit.KitTrail kind="badge" part="badge" tone="good" value={badge} density={density} />}
    trailing={chevron}>{null}</kit.KitRow> : chevron;
  return <kit.KitContent density={density}>
      <kit.KitRow part={null} inline fitContent label={name} {...{ lineRole, density }}
        leading={thumb && <kit.KitPhoto part="photo" shape="thumb" photo={thumb} label={name} />}
        leadingAlign="row" trailing={trailer}>
        <kit.KitContent density={density} rhythm="flush">
          <kit.KitText role={lineRole} part="name" density={density}>{name}</kit.KitText>
          <kit.KitText part="category" tone="muted" density={density}>{category}</kit.KitText>
        </kit.KitContent>
      </kit.KitRow>
      {(ratingReading || price || opening || distance) && <kit.KitContent group="response" density={density}>
        <kit.KitGrid density={density}>
          <kit.KitContent density={density}>
            {ratingReading && <kit.KitText role="label" tone="muted" part="rating" tabular density={density}>{ratingReading}</kit.KitText>}
            {price && <kit.KitText role="label" tone="muted" part="price_level" density={density}>{price}</kit.KitText>}
          </kit.KitContent>
          <kit.KitContent density={density}>
            {opening && <kit.KitText role="label" tone={opening.tone} part="open_state" density={density}>{opening.text}</kit.KitText>}
            {distance && <kit.KitText role="label" tone="muted" part="distance" density={density}>{distance}</kit.KitText>}
          </kit.KitContent>
        </kit.KitGrid>
      </kit.KitContent>}
    </kit.KitContent>;
}

// prettier-ignore
function VenueLoading({ input, copy, density, thumb }: { input: PlaceCardProps; copy: PlaceCopy; density: Density; thumb?: string | undefined }) {
  const heading = <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[[nameRole(density), input.name], ["body", input.category]]} />;
  return <kit.KitContent density={density}>
    {thumb ? <kit.KitGrid fitLast density={density}>
      {heading}<kit.KitSkeleton shape="figure" inset="none" density={density} lead="box" content={[]} />
    </kit.KitGrid> : heading}
    {(copy.ratingReading || copy.price || copy.opening || copy.distance || input.badge) && <kit.KitContent group="response" density={density}><kit.KitGrid density={density}>
      <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", copy.ratingReading], ["label", copy.price]]} />
      <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", copy.opening?.text], ["label", copy.distance], ["label", input.badge]]} />
    </kit.KitGrid></kit.KitContent>}
  </kit.KitContent>;
}

// prettier-ignore
function VenueActions({ live, density, saved }: { live: c.Values; density: Density; saved: boolean | undefined }) {
  const { words } = kit.useWords(placesWordsFor);
  const unit = live.distanceUnit;
  return <kit.KitContent inset="md" density={density}><kit.KitActionFooter density={density}><kit.KitGrid density={density}>
    <kit.KitContent density={density}>{saved !== undefined && <kit.KitGrid fitLast density={density}>
      <kit.KitLayoutText density={density} line={{ text: words.placeSave, role: "meta" }} />
      <kit.KitTrail part="save" kind="toggle" label={words.placeSave} on={saved} />
    </kit.KitGrid>}</kit.KitContent>{live.unitEnabled === true &&
    <kit.KitTrack part="unit" look="segments" role="radiogroup" label={words.placeUnits}>
      <kit.KitChip item={null} look="segment" role="radio" value="km" label={words.placeKm} on={unit === "km"} />
      <kit.KitChip item={null} look="segment" role="radio" value="mi" label={words.placeMi} on={unit === "mi"} />
    </kit.KitTrack>}
  </kit.KitGrid></kit.KitActionFooter></kit.KitContent>;
}

// prettier-ignore
export function PlaceCard(input: PlaceCardProps) {
  const { name, goto, saved } = input;
  const density = kit.useKit().density;
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const loading = kit.useComponentState() === "loading";
  const { resolvePhoto } = kit.useKit();
  const { lang } = kit.useWords(placesWordsFor);
  const live = kit.useLiveControls(meta, input);
  const unit = live.distanceUnit === "mi" || live.distanceUnit === "km" ? live.distanceUnit : input.unit;
  const copy = placeCardCopy({ ...input, unit }, kit.useDeviceData(), lang);
  const photo = media === "cover" && input.photo && resolvePhoto?.(input.photo) ? input.photo : undefined;
  const thumb = density === "compact" ? photo : undefined;
  const card = <kit.KitCard part="root" padded density={density} {...(loading ? {} : { goto, label: name })}>
    {photo && !thumb && (loading
      ? <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} density={density} />
      : <kit.KitPhoto part="photo" shape="wide" photo={photo} label={name} />)}
    {loading ? <VenueLoading input={input} {...{ copy, density, thumb }} />
      : <VenueDetail input={input} {...{ copy, density, thumb }} />}
  </kit.KitCard>;
  return !loading && (saved !== undefined || live.unitEnabled)
    ? <kit.KitContent density={density}>{card}<VenueActions {...{ live, density, saved }} /></kit.KitContent>
    : card;
}
