import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { playlistReading, playlistTiming } from "../copy";
import { mediaWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Playlist.generated";

// Core first: List/lead number cannot combine playback progress, duration, downloads and the playing row.
export const meta = {
  id: "Playlist",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The recordings are media files on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "plain", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: ["root", "lead", "title", "sub", "seconds", "played", "trail", "trail_icon"],
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], trail: ["press"] }, noGoto: { items: ["trail"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? playlistReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["tracks", "episodes"]).default("tracks"),
    items: z
      .array(
        z.strictObject({
          title: c.text(32),
          sub: c.text(36).optional(),
          seconds: z.int().min(1).max(36000),
          played: z.number().min(0).max(1),
          photo: c.photo.optional(),
          goto: c.screenId,
        }),
      )
      .min(1)
      .max(6),
    playing: z.int().min(0).max(5).optional(),
  })
  .refine(({ items, playing }) => playing === undefined || playing < items.length, { path: ["playing"] })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, items: value.items.map((item) => ({ ...item, sub: undefined })) }
      : value,
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    items: (items.length ? items : [undefined]).map((item, i) => ({
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(i, lang),
      seconds: 60,
      played: 0,
      goto: "player",
    })),
  };
}

// prettier-ignore
const episodeItems = [
  { title: "Time to sniff", sub: "18 Nov · A quiet route", seconds: 1080, played: 1, photo: "lib:dogs", goto: "sniff_break" },
  { title: "After the rain", sub: "20 Nov · Rain tips", seconds: 820, played: 0, goto: "after_rain" },
];

export const examples = [
  {
    playing: 0,
    items: [
      { title: "Choosing a pot", seconds: 245, played: 0.3, goto: "choose_a_pot" },
      { title: "When to water", seconds: 390, played: 0, goto: "water_the_fern" },
    ],
  },
  { style: "episodes", items: episodeItems },
  { style: "episodes", detail: "brief", items: episodeItems },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Playlist");
export const probes = [
  choose(
    "Queue separate podcast episodes in order, each with its running time, playback progress and a download control. Show which episode is playing.",
  ),
  choose(
    "Show a plain list of three saved garden centres, each with a short location note and a tap to open details",
    "List",
  ),
  write(
    "Show the two episodes Choosing a pot, 245 seconds and 30 percent played, opens choose_a_pot, and Watering without guessing, 390 seconds and unplayed, opens water_the_fern. The first is playing.",
  ),
  {
    ...write(
      "List the separate podcast episodes Sniff break (1080 seconds, fully played, opens sniff_break, note A quieter route) and After the rain (820 seconds, unplayed, opens after_rain, note Wet weather tips). Show their length, playback progress and download controls, but hide the episode notes.",
    ),
    variant: { axis: "detail", value: "brief", itemTitles: ["Sniff break", "After the rain"] },
  },
  read("Open When to water in its full player; do not download it", {
    address: "p1/r2",
    action: "press",
  }),
  read("Download When to water for offline listening; don't open its player", {
    address: "p1/r2/trail",
    action: "press",
  }),
] satisfies c.Probe[];

type PlaylistProps = c.Props<typeof props, typeof meta>;
type RowProps = {
  item: PlaylistProps["items"][number];
  index: number;
  current: boolean;
  episodes: boolean;
  density: c.ThemeDensity;
  loading: boolean;
};

// prettier-ignore
function PlaylistLead({ item, index, current, episodes, density, loading }: RowProps) {
  if (loading) return episodes && item.photo ?
    <kit.KitSkeleton inset="none" density={density} lead="box" items={[{ lines: [], photo: item.photo }]} /> :
    <kit.KitIcon name="dot" scale="lg" decorative />;
  if (current) return <kit.KitIcon name="activity" part="lead" tone="accent" scale="lg" />;
  if (episodes && item.photo) return <kit.KitPhoto photo={item.photo} label={item.title} part="lead" />;
  return <kit.KitRank place={index + 1} part="lead" density={density} />;
}

// prettier-ignore
function PlaylistRow(row: RowProps) {
  const { item, current, episodes, density, loading } = row;
  const { lang, words: { playlist: words } } = kit.useWords(mediaWordsFor);
  const { densityKind } = kit.useKitStyle();
  const leadDensity = episodes && densityKind === "airy" ? "compact" : density;
  const timing = playlistTiming(item.seconds, item.played, lang);
  const label = current ? words.nowPlaying(item.title) : item.title;
  return <kit.KitRow inline part={null} label={loading ? "" : label} role="group" selected={!loading && current}>
    <kit.KitGrid fitLast density={density}>
      <kit.KitRow part={loading ? null : "root"} goto={loading ? undefined : item.goto} label={item.title}
        leading={<PlaylistLead {...row} />} leadingAlign={episodes && item.photo && !current ? "row" : "line"}
        density={leadDensity} {...(episodes ? { leadingWidth: "avatar" as const } : {})}>
        <kit.KitContent lineRole="body" density={density}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", item.title], ["caption", item.sub]]} /> : <>
            <kit.KitText part="title" role="body" density={density}>{item.title}</kit.KitText>
            {item.sub && <kit.KitText part="sub" role="caption" tone="muted" density={density}>{item.sub}</kit.KitText>}
          </>}
          <kit.KitStepsTrack style="bar" part="played" count={1} at={loading ? 0 : item.played} />
          {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", timing]]} /> :
            <kit.KitText part="seconds" role="caption" tone="muted" tabular density={density}>{timing}</kit.KitText>}
        </kit.KitContent>
      </kit.KitRow>
      {loading ? <kit.KitSkeleton shape="control" kind="quiet" inset="none" /> :
        <kit.KitRow part="trail" role="button" label={words.download(item.title)} density={density}>
          <kit.KitIcon name="download" part="trail_icon" tone="muted" />
        </kit.KitRow>}
    </kit.KitGrid>
  </kit.KitRow>;
}

// prettier-ignore
export function Playlist(input: PlaylistProps) {
  const { items, playing, style, surface } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const context = kit.usePartContext();
  const episodes = style === "episodes";
  const loading = context.state === "loading";
  return <kit.KitCard part="root" {...{ density, surface }}>
    {context.state === "empty" ? <kit.KitEmpty part="empty" icon="music" decorativeIcon /> : <kit.KitGrid list arrange="rows" density={density}>
      {items.map((item, index) =>
        <kit.PartScope key={item.id} {...context} item={item.id}>
          <PlaylistRow {...{ item, index, episodes, density, loading }} current={index === playing} />
        </kit.PartScope>)}
    </kit.KitGrid>}
  </kit.KitCard>;
}
