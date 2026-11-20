import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Composer/entry accepts personal writing, not a shift's authored notes with shared acknowledgements.
export const meta = {
  id: "Handover",
  status: "draft",
  group: "content",
  purpose: "Read what the last shift passed on and mark each note as seen.",
  pick: "Read shift-to-shift notes with author, time, optional flag and a mark-as-seen control. Not writing your own note (Composer), chatting (Bubbles), or a record change log (ActivityLog).",
  writeHints: ["Put the newest note first. time is a short display label, such as 08:40."],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Shift notes and their acknowledgements are stored in a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "notes", parts: ["root", "by", "time", "text", "flag", "seen"] },
  states: ["filled", "empty"],
  actions: { items: { seen: ["check"] }, when: { seen: { seen: false } } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  notes: z
    .array(
      z.strictObject({
        by: c.text(20),
        time: c.text(12),
        text: c.text(160),
        flag: c.text(16).optional(),
        seen: z.boolean(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const note = (by: string, text: string) => ({ by, text, time: "09:00", seen: false });
  const detail = c.wordsFor(lang).placeholderDetail;
  const notes = c.itemsOf(cast, 6).flatMap((item) => {
    const by = c.titleOf(item, 20, thing);
    return by ? [note(by, c.detailOf(item, 160, thing) ?? detail)] : [];
  });
  return { notes: notes.length ? notes : [note(c.placeholderTitle(0, lang), detail)] };
}

export const examples = [
  {
    notes: [
      {
        by: "Anna",
        time: "08:40",
        text: "Leave the ferns in the shade until noon.",
        flag: "Heat warning",
        seen: false,
      },
      { by: "Rae", time: "07:15", text: "I moved the empty trays to the potting bench.", seen: true },
    ],
  },
  {
    density: "compact",
    notes: [
      {
        by: "Sam",
        time: "13:45",
        text: "Clover's spare lead is on the porch; use it for the afternoon walk.",
        flag: "Spare lead",
        seen: false,
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Handover");
export const probes = [
  choose(
    "Let the next work shift read notes left by the previous crew, newest first, and acknowledge each note as seen.",
  ),
  choose("Give me a private multi-line box to write my own note about how the plants did today.", "Composer"),
  write(
    "Pass on two shift notes, newest first: Anna at 08:40 says Leave the ferns in the shade until noon, flag Heat warning, not seen. Rae at 07:15 moved the empty trays to the potting bench, already seen.",
  ),
  read("Mark Anna's note about the ferns as seen", { address: "h1/r1/seen", action: "check" }),
] satisfies c.Probe[];
