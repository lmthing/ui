import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { libraryProgress, libraryReading } from "../copy";
import { mediaWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Library.generated";

// Core first: Gallery/grid cannot show reading progress and new-episode badges on saved covers.
export const meta = {
  id: "Library",
  status: "ready",
  group: "content",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The saved media items live on the device.",
  variants: { density: ["comfortable", "compact"], aspect: ["square", "tall"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["by"] } },
  parts: ["root", "empty"],
  items: { key: "items", parts: ["root", "title", "by", "photo", "progress", "badge"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? libraryReading((input as z.output<typeof props>).items, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z
      .array(
        z.strictObject({
          title: c.text(32),
          by: c.text(24).optional(),
          photo: c.photo,
          progress: z.number().min(0).max(1).optional(),
          badge: c.text(8).optional(),
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
export const examples = [
  {
    items: [
      { title: "Fern Shelf", by: "Noor Martin", photo: "lib:plants", progress: 0.42, badge: "2 new", goto: "fern_shelf" },
      { title: "Window Pots", by: "Maya Chen", photo: "lib:fern", progress: 0.68, badge: "New", goto: "window_garden" },
    ],
  },
  {
    items: [
      { title: "Slow Walk", by: "Ella Price", photo: "lib:dogs", progress: 0.75, goto: "slow_walk" },
      { title: "Clover Walk", photo: "lib:park_walk", badge: "New", goto: "out_with_clover" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Library");
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
      "In my saved podcast grid, show Fern Shelf (lib:fern, 42 percent finished, opens fern_shelf) and Window Garden (lib:basil, badge New, opens window_garden). Hide their bylines; don't change anything else about the display.",
    ),
    variant: { axis: "detail", value: "brief", itemTitles: ["Fern Shelf", "Window Garden"] },
  },
  read("Open Window Pots from my saved titles", { address: "l1/r2", action: "press" }),
] satisfies c.Probe[];

type LibraryProps = c.Props<typeof props, typeof meta>;
type TileProps = {
  item: LibraryProps["items"][number];
  density: c.ThemeDensity;
  aspect: LibraryProps["aspect"];
  loading: boolean;
};

// prettier-ignore
function LibraryMeter({ ratio, density, loading }: { ratio: number; density: c.ThemeDensity; loading: boolean }) {
  const { lang, words } = kit.useWords(mediaWordsFor);
  const label = words.library.progress, amount = libraryProgress(ratio, lang);
  return <kit.KitContent density={density}>
    <kit.KitGrid fitLast density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", label]]} /> :
        <kit.KitText part={null} role="caption" tone="muted" density={density}>{label}</kit.KitText>}
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["number", amount, "end", "compact"]]} /> :
        <kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>{amount}</kit.KitText>}
    </kit.KitGrid>
    <kit.KitStepsTrack style="bar" part="progress" at={loading ? 0 : ratio} count={1} />
  </kit.KitContent>;
}

// prettier-ignore
function LibraryCover({ item, density, aspect, loading }: TileProps) {
  const badge = item.badge && <kit.KitTrail kind="badge" part="badge" density={density} value={item.badge} />;
  return <kit.KitCard style="plain" padded inset="none" part="root" density={density}
    {...(loading ? {} : { goto: item.goto, label: item.title })}>
    {loading ? <kit.KitSkeleton shape="media" aspect={aspect} inset="none" density={density} content={[]} /> :
      <kit.KitPhoto photo={item.photo} part="photo" aspect={aspect} label={item.title} />}
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", item.title], ["caption", item.by]]} /> :
      <kit.KitContent density={density} lineRole="body">
        <kit.KitText role="body" part="title" density={density}>{item.title}</kit.KitText>
        {item.by && <kit.KitText role="caption" tone="muted" part="by" density={density}>{item.by}</kit.KitText>}
      </kit.KitContent>}
    {item.progress !== undefined && <LibraryMeter ratio={item.progress} {...{ density, loading }} />}
    {badge && <kit.KitContent density={density} leadingAlign="row" lead={badge}>{null}</kit.KitContent>}
  </kit.KitCard>;
}

export function Library(input: LibraryProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const aspect = kit.useVariant("aspect", meta.variants.aspect, input.aspect);
  const context = kit.usePartContext();
  const { words } = kit.useWords(mediaWordsFor);
  if (context.state === "empty")
    return (
      <kit.KitCard part="root">
        <kit.KitEmpty
          icon="book_open"
          part="empty"
          decorativeIcon
          {...(context.thing ? {} : { title: words.library.empty })}
        />
      </kit.KitCard>
    );
  const loading = context.state === "loading";
  return (
    <kit.KitCard part="root" density={density}>
      <kit.KitContent inset="md" density={density}>
        <kit.KitGrid list density={density}>
          {input.items.map((item) => (
            <kit.PartScope key={item.id} {...context} item={item.id}>
              <LibraryCover {...{ item, density, aspect, loading }} />
            </kit.PartScope>
          ))}
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitCard>
  );
}
