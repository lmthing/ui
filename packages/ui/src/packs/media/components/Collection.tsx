import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { collectionExtras, collectionReading, collectionSummary } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: Hero/media cover cannot combine collection credits, computed totals, play-all and follow.
export const meta = {
  id: "Collection",
  status: "ready",
  group: "content",
  purpose: "See one show's details, start the whole series and follow new releases.",
  pick: "The overview at the top of one show, album, book or course, with artwork, credits, play-all and follow. Not a photo and headline (Hero), a person (Profile), one recording (Player), or owned things (Things).",
  writeHints: [
    "Count and duration come from Playlist on this screen; never write either value.",
    'Use detail "brief" only when asked to hide the description. Keep it in about and leave density and aspect null unless explicitly requested.',
    'Use style "album" for an album cover presentation, "book" for a book overview with the title above the cover, or "show" if the show layout is explicitly requested. Otherwise use style null. Only include rating (0–5), ratingCount, up to three short tags, and shelfStatus when supplied.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The collection details are stored with the app's media.",
  variants: { density: ["comfortable", "compact"], aspect: ["square", "wide"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["about"] } },
  parts: [
    "root",
    "photo",
    "title",
    "by",
    "about",
    "summary",
    "rating",
    "rating_count",
    "tags",
    "shelf_status",
    "play",
    "play_icon",
    "play_label",
    "follow",
    "follow_icon",
    "follow_label",
  ],
  states: ["filled", "loading"],
  actions: { parts: { play: ["press"], follow: ["toggle"] } },
  deviceData: ["playlist"],
  previewDeviceData: () => ({
    playlist: [{ style: "episodes", items: [1080, 1260, 840].map((seconds) => ({ seconds })) }],
  }),
  read: (input, state, lang, data): string[] =>
    state === "filled"
      ? [
          ...Object.values(collectionExtras(input as CollectionProps, lang)).filter(
            (text): text is string => !!text,
          ),
          ...collectionReading(data?.playlist?.[0], (input as CollectionProps).followed, lang),
        ]
      : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["show", "album", "book"]).optional(),
    title: c.text(40),
    by: c.text(32),
    photo: c.photo,
    about: c.text(200).optional(),
    followed: z.boolean(),
    rating: z.number().min(0).max(5).optional(),
    ratingCount: z.int().nonnegative().optional(),
    tags: z.array(c.text(20)).max(3).optional(),
    shelfStatus: c.text(24).optional(),
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, about: undefined } : value));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    by: (item && c.detailOf(item, 32, thing)) || c.wordsFor(lang).placeholderLabel,
    photo: c.photo.safeParse(item && `lib:${item.type}`).data ?? "lib:item",
    followed: false,
  };
}

export const examples = [
  {
    title: "The Fern Shelf",
    by: "Noor Martin",
    photo: "lib:plants",
    about: "A short series on growing ferns indoors.",
    followed: false,
  },
  {
    title: "The Slow Walk",
    by: "Ella Price",
    photo: "lib:dogs",
    about: "Slow walks for curious dogs.",
    followed: true,
  },
  {
    style: "album",
    title: "Quiet Mornings",
    by: "Noor Martin",
    photo: "lib:fern",
    followed: false,
    rating: 4.5,
    ratingCount: 18,
  },
  {
    style: "book",
    title: "Window Pots",
    by: "Maya Chen",
    photo: "lib:basil",
    followed: true,
    tags: ["Gardening", "Field guide"],
    shelfStatus: "Want to read",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Collection");
// prettier-ignore
export const probes = [
  choose(
    "Give this podcast series one overview with its cover, presenter, total episode count, play-all and a follow button",
  ),
  choose(
    "Lead the homepage with one large photograph and the headline A greener home, without any playback or follow buttons",
    "Hero",
  ),
  write(
    "At the top of the show page, feature Life on the Fern Shelf by Noor Martin, artwork lib:plants. Describe it as A short series on ferns in a small flat. I haven't followed it yet. Give me play-all and follow.",
  ),
  {
    ...write(
      "Feature The Slow Walk by Ella Price with lib:dogs artwork, already followed. Save the description Field notes on exploring at a dog's pace, but don't show the description. Keep the credits, play-all and follow controls visible.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Follow this series without starting playback", { address: "c1/follow", action: "toggle" }),
  read("Start playing the whole series without changing whether I follow it", {
    address: "c1/play",
    action: "press",
  }),
  { ...write("Use the explicit show layout for Fern Shelf by Noor Martin, cover lib:fern, not followed."), expectProps: { style: "show" } },
  { ...write("Use the album overview for Quiet Mornings by Noor Martin, cover lib:fern, not followed."), expectProps: { style: "album" } },
  { ...write("Use the book overview for Window Pots by Maya Chen, cover lib:basil, not followed."), expectProps: { style: "book" } },
  { ...write("Use the show overview for Fern Shelf by Noor Martin, cover lib:fern, not followed. Show a rating of 4.5 out of 5."), expectProps: { rating: 4.5 } },
  { ...write("Use the show overview for Fern Shelf by Noor Martin, cover lib:fern, not followed. Show its 18 ratings; the average isn't known."), expectProps: { ratingCount: 18 } },
  { ...write("Show Fern Shelf by Noor Martin, cover lib:fern, not followed. Tag it Gardening and Field guide in that order."), expectProps: { tags: ["Gardening", "Field guide"] } },
  { ...write("Show the book overview for Window Pots by Maya Chen, cover lib:basil, not followed. Its reading shelf status is Want to read."), expectProps: { shelfStatus: "Want to read" } },
] satisfies c.Probe[];

type CollectionProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function CollectionActions({ followed, density }: { followed: boolean; density: c.ThemeDensity }) {
  const { screen, component } = kit.usePartContext();
  const following = kit.useControlValue(`${screen}/${component}/follow`, followed);
  const loading = kit.useComponentState() === "loading";
  const { words: { collection: words } } = kit.useWords(mediaWordsFor);
  const followIcon = following ? "check" : "plus";
  const followLabel = following ? words.following : words.follow;
  return <kit.KitActionFooter density={density}><kit.KitGrid density={density}>
    <kit.KitAction part={loading ? null : "play"} action="press" label={words.playAll} icon="play" full />
    <kit.KitAction part={loading ? null : "follow"} action="toggle" label={followLabel} icon={followIcon} kind="secondary" full />
  </kit.KitGrid></kit.KitActionFooter>;
}

// prettier-ignore
export function Collection(input: CollectionProps) {
  const { title, by, about, photo, followed, style } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const aspect = kit.useVariant("aspect", meta.variants.aspect, input.aspect);
  const loading = kit.useComponentState() === "loading";
  const { controller } = kit.useKit();
  const { playlist } = kit.useDeviceData();
  const { lang } = kit.useWords(mediaWordsFor);
  const sibling = controller?.snapshotScreen().components.find(({ c }) => c === "Playlist");
  const summary = collectionSummary(sibling ?? playlist?.[0], lang);
  const extras = collectionExtras(input, lang);
  const header = <kit.KitHeader density={density} align={style === "album" ? "center" : "start"}
    title={{ text: title, part: "title" }} meta={{ text: by, part: "by", role: "caption" }} />;
  const cover = <kit.KitPhoto part={loading ? null : "photo"} label={title} {...{ photo, aspect, loading }} />;
  const content = <>
    {style === "book" ? <>{header}{cover}</> : <>{cover}{header}</>}
    <kit.KitLayoutText density={density} line={{ text: about, part: "about" }} />
    {summary && <kit.KitFigure density={density} value={{ text: summary, part: "summary", compact: true }} />}
    {(extras.rating || extras.ratingCount) && <kit.KitFigure density={density}
      value={{ text: extras.rating ?? extras.ratingCount, part: extras.rating ? "rating" : "rating_count", compact: true }}
      {...(extras.rating && extras.ratingCount ? { caption: <kit.KitLayoutText density={density}
        line={{ text: extras.ratingCount, part: "rating_count", role: "caption", tone: "muted" }} /> } : {})} />}
    <kit.KitLayoutText density={density} line={{ text: extras.tags, part: "tags", role: "caption", tone: "muted" }} />
    <kit.KitLayoutText density={density} line={{ text: extras.shelfStatus, part: "shelf_status", role: "caption" }} />
    <CollectionActions {...{ followed, density }} />
  </>;
  return <kit.KitCard part="root" padded density={density}>
    <kit.KitState density={density} loading={content}>{content}</kit.KitState>
  </kit.KitCard>;
}
