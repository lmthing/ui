import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Gallery/grid cannot show reading progress and new-episode badges on saved covers.
export const meta = {
  id: "Library",
  status: "draft",
  group: "content",
  purpose: "Browse saved books, shows or albums and see progress and new releases.",
  pick: "The media the person has saved to read or play, shown as cover tiles with per-title progress and new episode badges. Not a grid of photos (Gallery), a shelf of suggestions (List), or things owned (Things).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The saved media items live on the device.",
  variants: { density: ["comfortable", "compact"], aspect: ["square", "tall"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "title", "by", "photo", "progress", "badge"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
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
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 4);
  return {
    items: (items.length ? items : [undefined]).map((item, i) => ({
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(i, lang),
      photo: c.photo.safeParse(thing && `lib:${thing.type}`).data ?? "lib:item",
      goto: "details",
    })),
  };
}

export const examples = [
  {
    items: [
      {
        title: "Life on the Fern Shelf",
        by: "Noor Martin",
        photo: "lib:plants",
        progress: 0.42,
        badge: "2 new",
        goto: "fern_shelf",
      },
      { title: "A Window Garden", photo: "lib:plants", goto: "window_garden" },
    ],
  },
  {
    aspect: "tall",
    density: "compact",
    items: [
      { title: "The Slow Walk", by: "Ella Price", photo: "lib:dogs", progress: 0.75, goto: "slow_walk" },
      { title: "Out With Clover", photo: "lib:dogs", badge: "New", goto: "out_with_clover" },
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
  read("Open A Window Garden from my saved titles", { address: "l1/r2", action: "press" }),
] satisfies c.Probe[];
