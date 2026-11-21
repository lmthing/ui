import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Player/default can scrub one recording but cannot jump to named chapter marks.
export const meta = {
  id: "ChapterList",
  status: "draft",
  group: "content",
  purpose: "Jump to named chapters of the recording already on this screen.",
  pick: "Named timestamps inside the recording already on this screen; choose one to jump to its start. Not playback controls for one recording (Player), separate recordings (Playlist), or recipe steps (CookSteps).",
  writeHints: [
    'Use only next to a Player on the same screen. Put 2–16 chapter times in strictly increasing order, whole seconds from the start. "current" is a zero-based index.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The chapter marks are stored with the recording.",
  drives: "Player",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "chapters", parts: ["root", "title", "at"] },
  states: ["filled"],
  actions: { items: { root: ["press"] } },
  read: (value, _state, lang): string[] =>
    (value as z.output<typeof props>).chapters.map(({ at, title }) => `${c.clockLine(at, lang)} ${title}`),
} as const satisfies c.Meta & { drives: "Player" };

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    chapters: z
      .array(z.strictObject({ title: c.text(32), at: z.int().min(0).max(36000) }))
      .min(2)
      .max(16),
    current: z.int().min(0).max(15).optional(),
  })
  .refine(({ chapters }) => chapters.every(({ at }, i) => i === 0 || at > chapters[i - 1]!.at), {
    path: ["chapters"],
  })
  .refine(({ chapters, current }) => current === undefined || current < chapters.length, {
    path: ["current"],
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    chapters: Array.from({ length: Math.max(items.length, 2) }, (_, i) => {
      const item = items[i];
      return { title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(i, lang), at: i * 20 };
    }),
  };
}

export const examples = [
  {
    chapters: [
      { title: "Set out the pot", at: 0 },
      { title: "Loosen the roots", at: 48 },
      { title: "Water it in", at: 112 },
    ],
    current: 1,
  },
  {
    chapters: [
      { title: "Clip on the lead", at: 0 },
      { title: "Cross at the gate", at: 80 },
    ],
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ChapterList");
export const probes = [
  choose(
    "Beneath the recording already playing on this screen, give me named chapter timestamps I can tap to jump right there",
  ),
  choose("Play a single twelve-minute recording with pause and a scrubber and no named chapters", "Player"),
  write(
    "For the recording playing on this screen, let me jump to Set out the pot at 0:00, Loosen the roots at 0:48 or Water it in at 1:52. I'm at the second chapter.",
  ),
  read("Jump to the Water it in chapter", { address: "c1/r3", action: "press" }),
] satisfies c.Probe[];
