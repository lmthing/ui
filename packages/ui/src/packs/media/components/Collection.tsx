import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { collectionReading, collectionSummary } from "../copy";
import { mediaWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Collection.generated";

// Core first: Hero/media cover cannot combine collection credits, computed totals, play-all and follow.
export const meta = {
  id: "Collection",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
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
      ? collectionReading(data?.playlist?.[0], (input as CollectionProps).followed, lang)
      : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    by: c.text(32),
    photo: c.photo,
    about: c.text(200).optional(),
    followed: z.boolean(),
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
    about: "A short series on making room for ferns in a small flat.",
    followed: false,
  },
  {
    title: "The Slow Walk",
    by: "Ella Price",
    photo: "lib:dogs",
    about: "Slow walks for curious dogs.",
    followed: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Collection");
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
] satisfies c.Probe[];

type CollectionProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function CollectionActions({ loading, followed, density }: {
  loading: boolean;
  followed: boolean;
  density: c.ThemeDensity;
}) {
  const { screen, component } = kit.usePartContext();
  const following = kit.useControlValue(`${screen}/${component}/follow`, followed);
  const { words: { collection: words } } = kit.useWords(mediaWordsFor);
  const followIcon = following ? "check" : "plus";
  const followLabel = following ? words.following : words.follow;
  return <kit.KitGrid {...{ density }}>
    {loading ? <kit.KitSkeleton shape="control" label={words.playAll} inset="none" full /> :
      <kit.KitAction part="play" action="press" label={words.playAll} icon="play" full />}
    {loading ? <kit.KitSkeleton shape="control" label={followLabel} kind="secondary" inset="none" full /> :
      <kit.KitAction part="follow" action="toggle" label={followLabel} icon={followIcon} kind="secondary" full />}
  </kit.KitGrid>;
}

// prettier-ignore
function CollectionDetails({ title, by, about, density, summary }: Pick<CollectionProps, "title" | "by" | "about"> & {
  density: c.ThemeDensity;
  summary: string | undefined;
}) {
  return <>
    <kit.KitContent lineRole="title" {...{ density }}>
      <kit.KitText part="title" role="title" {...{ density }}>{title}</kit.KitText>
      <kit.KitText part="by" role="label" tone="muted" {...{ density }}>{by}</kit.KitText>
      {summary && <kit.KitText part="summary" role="label" tone="muted" {...{ density }}>{summary}</kit.KitText>}
    </kit.KitContent>
    {about && <kit.KitText part="about" role="body" {...{ density }}>{about}</kit.KitText>}
  </>;
}

export function Collection(input: CollectionProps) {
  const { title, by, about, photo, followed } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const aspect = kit.useVariant("aspect", meta.variants.aspect, input.aspect);
  const loading = kit.useComponentState() === "loading";
  const { controller } = kit.useKit();
  const { playlist } = kit.useDeviceData();
  const { lang } = kit.useWords(mediaWordsFor);
  const sibling = controller?.snapshotScreen().components.find(({ c }) => c === "Playlist");
  const summary = collectionSummary(sibling ?? playlist?.[0], lang);
  return (
    <kit.KitCard part="root" padded {...{ density }}>
      {loading ? (
        <>
          <kit.KitSkeleton shape="media" inset="none" content={[]} {...{ aspect, density }} />
          <kit.KitSkeleton
            shape="figure"
            inset="none"
            {...{ density }}
            content={[
              ["title", title],
              ["label", by],
              ["label", summary],
            ]}
          />
          {about && (
            <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", about]]} />
          )}
        </>
      ) : (
        <>
          <kit.KitPhoto part="photo" label={title} {...{ photo, aspect }} />
          <CollectionDetails {...{ title, by, about, density, summary }} />
        </>
      )}
      <CollectionActions {...{ followed, density, loading }} />
    </kit.KitCard>
  );
}
