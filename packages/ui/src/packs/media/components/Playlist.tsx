import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { playlistNext, playlistReading, playlistTiming } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: List/lead number cannot combine playback progress, duration, downloads and the playing row.
export const meta = {
  id: "Playlist",
  status: "ready",
  group: "content",
  purpose: "Choose an ordered track or episode and see its playback progress.",
  pick: "An ordered queue of separate tracks or episodes, with durations, played progress and download controls. Not ordinary rows (List) or chapter marks within one recording (ChapterList).",
  writeHints: [
    'Use style "episodes" for dated episodes with a description line in sub, "queue" if asked to show an Up next playback queue, otherwise "tracks" for numbered tracks. If no episode note or date is supplied, set sub to null. The playing index is zero-based; omit it unless one is playing.',
    "Seconds are whole recording lengths; played is a fraction from zero to one. Each row opens its own player screen.",
    'Default to "detail":null,"density":null,"surface":null. Only when explicitly asked to hide episode notes, write "detail":"brief"; keep the supplied notes in sub and leave density and surface null unless independently requested.',
  ],
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
  parts: ["root", "empty", "queue_label"],
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
    style: z.enum(["tracks", "episodes", "queue"]).default("tracks"),
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
  { style: "queue", items: episodeItems, playing: 0 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Playlist");
// prettier-ignore
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
  { ...write("Show my playback queue with an Up next heading: Choosing a pot (245 seconds, 30 percent played, opens choose_a_pot) is playing, then When to water (390 seconds, unplayed, opens water_the_fern)."), expectProps: { style: "queue", playing: 0 } },
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
  if (current) return <kit.KitIcon name="activity" part="lead" tone="accent" scale="lg" loading={loading} />;
  if (episodes && item.photo) return <kit.KitPhoto photo={item.photo} label={item.title} part="lead" loading={loading} />;
  if (loading) return <kit.KitLayoutText line={{ text: c.numberLine(index + 1), role: "meta", tabular: true }} density={density} />;
  return <kit.KitRank place={index + 1} part="lead" density={density} />;
}

// prettier-ignore
function PlaylistRow(row: RowProps) {
  const { item, current, episodes, density, loading } = row;
  const { lang, words: { playlist: words } } = kit.useWords(mediaWordsFor);
  const timing = playlistTiming(item.seconds, item.played, lang);
  const label = current ? words.nowPlaying(item.title) : item.title;
  const download = <kit.KitAction part={loading ? null : "trail"} action="press" kind="quiet" icon="download" a11y={words.download(item.title)} />;
  return <kit.KitRow part={null} label={loading ? "" : label} role="group" selected={!loading && current}
    {...{ density, trailing: download }}>
    <kit.KitRow inline part={loading ? null : "root"} goto={loading ? undefined : item.goto} label={item.title}
      leading={<PlaylistLead {...row} />} leadingAlign={episodes && item.photo && !current ? "row" : "line"}
      density={density} {...(episodes ? { leadingWidth: "avatar" as const } : {})}>
      <kit.KitContent group="content" density={density}>
        <kit.KitMetaLine density={density} title={{ text: item.title, part: "title" }}
          meta={{ text: item.sub, part: "sub", role: "caption" }} />
        <kit.KitStepsTrack style="bar" part="played" count={1} at={loading ? 0 : item.played} />
        <kit.KitLayoutText density={density} line={{ text: timing, part: "seconds", role: "caption", tone: "muted", tabular: true }} />
      </kit.KitContent>
    </kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
export function Playlist(input: PlaylistProps) {
  const { items, playing, style, surface } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const context = kit.usePartContext();
  const episodes = style === "episodes";
  const loading = context.state === "loading";
  const { words } = kit.useWords(mediaWordsFor);
  const rows = items.map((item, index) => <kit.PartScope key={item.id} {...context} item={item.id}>
    <PlaylistRow {...{ item, index, episodes, density, loading }} current={index === playing} />
  </kit.PartScope>);
  const next = playlistNext(input);
  const content = <>
    <kit.KitRowGroup density={density}>{rows.slice(0, next)}</kit.KitRowGroup>
    {next < rows.length && <>
      <kit.KitContent inset="md" density={density}><kit.KitLayoutText density={density}
        line={{ text: words.playlist.upNext, part: "queue_label", role: "meta", strong: true }} /></kit.KitContent>
      <kit.KitRowGroup density={density}>{rows.slice(next)}</kit.KitRowGroup>
    </>}
  </>;
  return <kit.KitCard part="root" {...{ density, surface }}>
    <kit.KitState density={density} loading={content} part="empty" icon="music">{content}</kit.KitState>
  </kit.KitCard>;
}
