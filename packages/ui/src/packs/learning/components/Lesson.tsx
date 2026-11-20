import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Note/body cannot teach with a title, explanation, illustrated example and continue action.
export const meta = {
  id: "Lesson",
  status: "draft",
  group: "content",
  purpose: "Learn one idea from a short explanation and worked example before practising it.",
  pick: "Teach one idea with a titled explanation, an optional illustrated example and a continue action. Not a short supporting sentence (Note), long-form reading (Article) or an assessed question (Quiz).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Lesson content is stored with the app.",
  variants: { surface: ["card", "outlined"], emphasis: ["normal", "hero"] },
  parts: ["root", "title", "text", "example", "photo", "next"],
  states: ["filled"],
  actions: { parts: { next: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(40),
  text: c.text(400),
  example: c.text(160).optional(),
  photo: c.photo.optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 40, thing)) ?? c.placeholderTitle(0, lang),
    text: (item && c.detailOf(item, 400, thing)) ?? c.wordsFor(lang).placeholderDetail,
  };
}

export const examples = [
  {
    title: "The water radical",
    text: "水 means water. On the left of a character it often becomes three strokes: 氵.",
    example: "海 (umi) means sea. The three strokes on the left are the water radical.",
    photo: "lib:ocean",
  },
  {
    title: "Relative minor",
    text: "A major key and its relative minor share the same key signature. Count down three semitones from the major tonic to find the minor tonic.",
    example: "G major and E minor both have one sharp, F sharp.",
    surface: "outlined",
    emphasis: "hero",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Lesson");
export const probes = [
  choose(
    "Teach me one concept with a heading, an explanation, a separate worked example and a button to carry on.",
  ),
  choose(
    "Add a single quiet supporting sentence below the main content, without a heading or button.",
    "Note",
  ),
  write(
    "Teach one step titled The water radical: 水 means water. Show 海 means sea in a separate worked example.",
  ),
  read("Continue from the explanation to the next step.", { address: "l1/next", action: "press" }),
] satisfies c.Probe[];
