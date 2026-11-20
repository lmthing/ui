import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/lead number cannot combine playback progress, duration, downloads and the playing row.
export const meta = {
  id: "Playlist",
  status: "draft",
  group: "content",
  purpose: "Choose an ordered track or episode and see its playback progress.",
  pick: "An ordered queue of separate tracks or episodes, with durations, played progress and download controls. Not ordinary rows (List) or chapter marks within one recording (ChapterList).",
  writeHints: [
    'Use style "episodes" for dated episodes with a description line in sub, otherwise "tracks" for numbered tracks. The playing index is zero-based; omit it unless one is playing.',
    "Seconds are whole recording lengths; played is a fraction from zero to one. Each row opens its own player screen.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The recordings are media files on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "lead", "title", "sub", "seconds", "played", "trail"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], trail: ["press"] }, noGoto: { items: ["trail"] } },
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
  .refine(({ items, playing }) => playing === undefined || playing < items.length, { path: ["playing"] });

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

export const examples = [
  {
    playing: 0,
    items: [
      { title: "Choosing a pot", seconds: 245, played: 0.3, goto: "choose_a_pot" },
      { title: "Watering without guessing", seconds: 390, played: 0, goto: "water_the_fern" },
    ],
  },
  {
    style: "episodes",
    density: "compact",
    items: [
      {
        title: "Give the dog time to sniff",
        sub: "18 Nov · A quieter route",
        seconds: 1080,
        played: 1,
        photo: "lib:dogs",
        goto: "sniff_break",
      },
      {
        title: "Walking after rain",
        sub: "20 Nov · Wet weather tips",
        seconds: 820,
        played: 0,
        goto: "after_rain",
      },
    ],
  },
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
  read("Open Watering without guessing in its full player; do not download it", {
    address: "p1/r2",
    action: "press",
  }),
] satisfies c.Probe[];
