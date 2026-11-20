import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/default cannot show long quoted passages with source moments and separate notes.
export const meta = {
  id: "Highlights",
  status: "draft",
  group: "content",
  purpose: "Revisit saved passages and clips at their original source.",
  pick: "Saved quotes or clip moments with a source, optional time and optional personal note, opening where they came from. Not original journal entries (Entries), whole saved titles (Library), or short tappable rows (List).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The saved excerpts live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "text", "from", "at", "note"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z
    .array(
      z.strictObject({
        text: c.text(240),
        from: c.text(36),
        at: c.text(12).optional(),
        note: c.text(120).optional(),
        goto: c.screenId,
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    items: (items.length ? items : [undefined]).map((item, i) => ({
      text: (item && c.detailOf(item, 240, thing)) || c.wordsFor(lang).placeholderDetail,
      from: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(i, lang),
      goto: "details",
    })),
  };
}

export const examples = [
  {
    items: [
      {
        text: "Water only after checking how the soil feels, not because it happens to be Tuesday.",
        from: "Life on the Fern Shelf",
        at: "04:32",
        note: "Try the finger test on the kitchen fern.",
        goto: "fern_watering",
      },
    ],
  },
  {
    surface: "plain",
    density: "compact",
    items: [
      {
        text: "Give them a little extra time at the gate and let them decide where to sniff first.",
        from: "The Slow Walk",
        goto: "sniff_break",
      },
      {
        text: "A loose lead is a conversation, not a tug-of-war.",
        from: "Before the first walk",
        at: "02:14",
        goto: "before_the_walk",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Highlights");
export const probes = [
  choose(
    "Gather the exact passages and clip moments I saved, with the source and my notes, so I can reopen any quote at its original spot",
  ),
  choose(
    "Show three bookmarked websites in simple tappable rows, each with a name and one short description, no quotes or clip times",
    "List",
  ),
  write(
    "Show my saved passage Water only after checking how the soil feels, from Life on the Fern Shelf at 04:32. My note is Try the finger test on the kitchen fern. Open fern_watering.",
  ),
  read("Open the source of Water only after checking how the soil feels", {
    address: "h1/r1",
    action: "press",
  }),
] satisfies c.Probe[];
