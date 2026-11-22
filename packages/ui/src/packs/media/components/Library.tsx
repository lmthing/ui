import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { libraryProgress, libraryReading, libraryStatus, libraryStatuses } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: Gallery/grid cannot show reading progress and new-episode badges on saved covers.
// prettier-ignore
export const meta = {
  id: "Library",
  status: "ready",
  group: "content",
  purpose: "Browse saved books, shows or albums and see progress and new releases.",
  pick: "The media the person has saved to read or play, shown as cover tiles with per-title progress and new episode badges. Not a grid of photos (Gallery), a shelf of suggestions (List), or things owned (Things).",
  writeHints: [
    'Default to "density":null,"aspect":null,"detail":null. Set aspect only if a crop is explicitly requested; do not infer it from the type of media.',
    'When asked to hide bylines, change only "detail":"brief"; leave density and aspect null. Keep progress as a fraction and badges as short authored text.',
    'For the usual cover grid leave arrange and style null. If asked for a grid, vertical list, or sideways shelf, set arrange to "grid", "rows", or "strip" respectively. For a loan list use style "loans" and arrange "rows"; loans puts status and due labels first regardless of arrangement. Copy each supplied status and dueLabel onto its own item.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The saved media items live on the device.",
  variants: { density: ["comfortable", "compact"], aspect: ["square", "tall"],
    detail: ["full", "brief"], arrange: ["grid", "rows", "strip"] },
  variantParts: { "detail.brief": { hides: ["by"] } },
  parts: ["root", "empty"],
  items: { key: "items", parts: ["root", "title", "by", "photo", "progress", "badge", "status", "due_label"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? libraryReading((input as z.output<typeof props>).items, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["loans"]).optional(),
    items: z
      .array(
        z.strictObject({
          title: c.text(32),
          by: c.text(24).optional(),
          photo: c.photo,
          progress: z.number().min(0).max(1).optional(),
          badge: c.text(8).optional(),
          status: z.enum(libraryStatuses).optional(),
          dueLabel: c.text(24).optional(),
          goto: c.screenId,
        }),
      )
      .min(1)
      .max(12),
  })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, items: value.items.map((item) => ({ ...item, by: undefined })) }
      : value,
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 4);
  return {
    items: (items.length ? items : [undefined]).map((item, i) => ({
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(i, lang),
      photo: c.photo.safeParse(item && `lib:${item.type}`).data ?? "lib:item",
      goto: "details",
    })),
  };
}

// prettier-ignore
const covers = [
  { title: "Fern Shelf", by: "Noor Martin", photo: "lib:fern_shelf", progress: 0.42, badge: "2 new", goto: "fern_shelf" },
  { title: "Window Pots", by: "Maya Chen", photo: "lib:window_pots", progress: 0.68, badge: "New", goto: "window_garden" },
];
// prettier-ignore
export const examples = [
  { items: covers },
  {
    items: [
      { title: "Slow Walk", by: "Ella Price", photo: "lib:slow_walk", progress: 0.75, badge: "New", goto: "slow_walk" },
      { title: "Clover Walk", photo: "lib:clover_walk", badge: "New", goto: "out_with_clover" },
    ],
  },
  { arrange: "rows", items: covers },
  { arrange: "strip", items: [...covers, { title: "Pip", photo: "lib:slow_walk", goto: "slow_walk" }] },
  { style: "loans", arrange: "rows", items: [{ ...covers[0]!, status: "borrowed", dueLabel: "Due Friday" }, { ...covers[1]!, status: "hold" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Library");
// prettier-ignore
export const probes = [
  choose(
    "Put all my saved audiobooks and podcasts in a cover grid with my progress and badges for new episodes",
  ),
  choose(
    "Show my six vacation photos in a grid so I can browse the actual pictures, with no books or recordings",
    "Gallery",
  ),
  write(
    "Make my saved cover grid: Life on the Fern Shelf by Noor Martin, lib:plants, 42 percent done, badge 2 new, opens fern_shelf. Also show A Window Garden, lib:plants, opens window_garden.",
  ),
  {
    ...write(
      "Keep the default arrangement for my saved podcasts: Fern Shelf (lib:fern, 42 percent finished, opens fern_shelf) and Window Garden (lib:basil, badge New, opens window_garden). Change only the detail setting to hide their bylines. Leave the arrangement, spacing, and cover crop unspecified.",
    ),
    variant: { axis: "detail", value: "brief", itemTitles: ["Fern Shelf", "Window Garden"] },
  },
  read("Open Window Pots from my saved titles", { address: "l1/r2", action: "press" }),
  { ...write("Explicitly arrange my saved Fern Shelf (lib:fern, opens fern_shelf) and Window Pots (lib:basil, opens window_garden) in a grid."), expectProps: { arrange: "grid" } },
  { ...write("Put my saved Fern Shelf (lib:fern, opens fern_shelf) and Window Pots (lib:basil, opens window_garden) in a vertical list, one title per row."), variant: { axis: "arrange", value: "rows", itemTitles: ["Fern Shelf", "Window Pots"] } },
  { ...write("Put my saved Fern Shelf (lib:fern, opens fern_shelf) and Window Pots (lib:basil, opens window_garden) on a sideways scrolling cover shelf."), variant: { axis: "arrange", value: "strip", itemTitles: ["Fern Shelf", "Window Pots"] } },
  { ...write("Show my library loans list in vertical rows, with each loan status before the byline. Fern Shelf (lib:fern, opens fern_shelf) is borrowed, and Window Pots (lib:basil, opens window_garden) is on hold."), expectProps: { style: "loans", arrange: "rows" } },
  { ...write("Show my saved title Fern Shelf (lib:fern, opens fern_shelf). Its status is finished."), expectProps: { items: [{ status: "finished" }] } },
  { ...write('Show my saved title Fern Shelf (lib:fern, opens fern_shelf), due Friday. Use the due label "Due Friday".'), expectProps: { items: [{ dueLabel: "Due Friday" }] } },
] satisfies c.Probe[];

type LibraryProps = c.Props<typeof props, typeof meta>;
type TileProps = {
  item: LibraryProps["items"][number];
  density: c.ThemeDensity;
  aspect: LibraryProps["aspect"];
  style: LibraryProps["style"];
  row: boolean;
  loading: boolean;
};

// prettier-ignore
function LibraryMeter({ ratio, density, loading }: { ratio: number; density: c.ThemeDensity; loading: boolean }) {
  const { lang, words } = kit.useWords(mediaWordsFor);
  const label = words.library.progress, amount = libraryProgress(ratio, lang);
  if (!loading) return <kit.KitRow inline fitContent part="progress" label="" density={density}>
    <kit.KitMeter {...{ label, amount, ratio }} slim addressed={false} />
  </kit.KitRow>;
  return <kit.KitContent density={density}>
    <kit.KitGrid fitLast density={density}>
      <kit.KitLayoutText line={{ text: label, role: "caption", tone: "muted" }} density={density} />
      <kit.KitLayoutText line={{ text: amount, role: "caption", tone: "muted", tabular: true }} density={density} />
    </kit.KitGrid>
    <kit.KitStepsTrack style="bar" part="progress" at={0} count={1} />
  </kit.KitContent>;
}

// prettier-ignore
function LibraryTile({ item, density, aspect, style, row, loading }: TileProps) {
  const { lang } = kit.useWords();
  const status = { text: libraryStatus(item.status, lang), part: "status", role: "caption" } as const;
  const due = { text: item.dueLabel, part: "due_label", role: "caption" } as const;
  const by = { text: item.by, part: "by", role: "caption", tone: "muted" } as const;
  const badge = { text: item.badge, part: "badge", role: "caption", tone: "accent", strong: true } as const;
  const photo = <kit.KitPhoto photo={item.photo} part="photo" aspect={aspect} label={item.title} loading={loading} />;
  const title = <kit.KitMetaLine title={{ text: item.title, part: "title" }}
    meta={style === "loans" ? [] : [badge, by, status, due]} density={density} />;
  const heading = style === "loans" ? <kit.KitContent density={density}>
    {title}
    {(status.text || due.text) && <kit.KitContent rhythm="flush" density={density}>
      <kit.KitLayoutText line={{ ...status, strong: true }} density={density} />
      <kit.KitLayoutText line={{ ...due, tone: "muted" }} density={density} />
    </kit.KitContent>}
    <kit.KitLayoutText line={by} density={density} />
    <kit.KitLayoutText line={badge} density={density} />
  </kit.KitContent> : title;
  const details = <kit.KitContent density={density}>
    {row ? <kit.KitRow leading={photo} leadingAlign="row" leadingWidth="avatar" inline fitContent
      part={null} label="" density={density}>{heading}</kit.KitRow> : heading}
    {item.progress !== undefined && <LibraryMeter ratio={item.progress} {...{ density, loading }} />}
  </kit.KitContent>;
  if (row) return <kit.KitRow label={loading ? "" : item.title} part={loading ? null : "root"} density={density}
    goto={loading ? undefined : item.goto} inset="none">{details}</kit.KitRow>;
  return <kit.KitCard style="plain" part="root" density={density}
    {...(loading ? {} : { goto: item.goto, label: item.title })}>
    <kit.KitFigure media={photo} caption={details} density={density} />
  </kit.KitCard>;
}

// prettier-ignore
export function Library(input: LibraryProps) {
  const { style } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const aspect = kit.useVariant("aspect", meta.variants.aspect, input.aspect);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const row = arrange === "rows";
  const context = kit.usePartContext();
  const { words } = kit.useWords(mediaWordsFor);
  const loading = context.state === "loading";
  const tiles = input.items.map((item) => <kit.PartScope key={item.id} {...context} item={item.id}>
    <LibraryTile {...{ item, density, aspect, style, row, loading }} />
  </kit.PartScope>);
  const content = row ? <kit.KitRowGroup density={density}>{tiles}</kit.KitRowGroup> :
    <kit.KitGrid list arrange={arrange} density={density}>{tiles}</kit.KitGrid>;
  return <kit.KitCard part="root" surface={arrange === "strip" && context.state !== "empty" ? "plain" : "card"} padded density={density}>
    <kit.KitState density={density} loading={content} icon="book_open" part="empty"
      message={context.thing ? undefined : words.library.empty}>{content}</kit.KitState>
  </kit.KitCard>;
}
