import { z } from "zod";
import * as c from "../../../catalog";
import { transcriptReading } from "../copy";

// Core first: Article/article can show static text but cannot follow a playhead, seek per line, or clip timed lines.
const player = { component: "Player", part: "scrubber" } as const;

export const meta = {
  id: "Transcript",
  status: "draft",
  group: "content",
  purpose: "Follow lyrics or spoken lines in time with a recording and save individual lines.",
  pick: "Continuous timed lyrics or verbatim spoken lines beside the recording, with line-level seek and clipping. Not a static reading (Article), named chapter jumps (ChapterList), or saved quotes alone (Highlights).",
  writeHints: [
    'Use only beside one Player on the same screen. Supply the actual lines in strictly increasing whole seconds, not chapter names. Use style "spoken" for dialogue or narration; lyrics is the default.',
    "Use a zero-based current index only for an initial highlight. Follow scrolls to the active line by default.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Timed captions or LRC files come from the recording or its media host.",
  drives: {
    commands: [{ scope: "item", part: "root", to: player, action: "seek", payload: { from: "at" } }],
    observe: { from: player, at: "playhead" },
  },
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "follow", "lines", "empty"],
  items: { key: "lines", parts: ["root", "at", "speaker", "text", "save"] },
  states: ["filled", "empty", "loading"],
  actions: { parts: { follow: ["toggle"] }, items: { root: ["press"], save: ["press"] } },
  live: { toggles: { follow: { prop: "follow", initial: true } } },
  read: (value, state, lang) =>
    state === "filled" ? transcriptReading(value as Parameters<typeof transcriptReading>[0], lang) : [],
} as const satisfies c.Meta;

const maxLines = 40;
const maxText = 160;
const line = z.strictObject({
  at: z.int().min(0).max(36000),
  speaker: c.text(20).optional(),
  text: c.text(maxText),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    lines: z.array(line).min(2).max(maxLines),
    current: z
      .int()
      .min(0)
      .max(maxLines - 1)
      .optional(),
    follow: z.boolean().default(true),
    style: z.enum(["lyrics", "spoken"]).default("lyrics"),
  })
  .refine(({ lines }) => lines.every(({ at }, i) => !i || at > lines[i - 1]!.at), { path: ["lines"] })
  .refine(({ lines, current }) => current === undefined || current < lines.length, { path: ["current"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    lines: Array.from({ length: Math.max(2, items.length) }, (_, i) => {
      const item = items[i];
      return { at: i * 4, text: (item && c.titleOf(item, maxText, thing)) || c.placeholderTitle(i, lang) };
    }),
  };
}

export const examples = [
  {
    lines: [
      { at: 0, text: "Little fern by the window" },
      { at: 4, text: "Unroll into the morning light" },
      { at: 8, text: "Leave a little room to grow" },
    ],
    current: 1,
  },
  {
    style: "spoken",
    follow: false,
    lines: [
      { at: 0, speaker: "Maya", text: "Give Clover time to sniff at the gate." },
      { at: 5, speaker: "Jo", text: "Then wait for her to turn back before you move." },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Transcript");
export const probes = [
  choose(
    "Show the exact words next to my podcast audio, highlighting them line by line and jumping when I tap",
  ),
  choose(
    "Publish the entire essay for me to read, with headings and paragraphs but no audio or timing",
    "Article",
  ),
  {
    ...write(
      'Show lyrics timed to the recording: at 0 seconds "Little fern by the window"; at 4 seconds "Unroll into the morning light".',
    ),
    expectProps: { lines: examples[0]!.lines.slice(0, 2) },
  },
  {
    ...read("Jump the recording to the line about growing", { address: "t1/r3", action: "press" }),
    siblings: [{ id: "p1", c: "Player", title: "Little fern", media: "lib:little_fern", seconds: 30 }],
  },
] satisfies c.Probe[];
