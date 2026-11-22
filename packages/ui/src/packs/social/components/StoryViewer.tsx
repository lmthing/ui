import { z } from "zod";
import * as c from "../../../catalog";
import { storyViewerReading } from "../copy";

const maxSlides = 8;
const maxReply = 120;
const slideIntervalMs = 5000;

// Core first: Gallery/carousel browses static photos, not timed stories with slide replies or stickers.
// prettier-ignore
export const meta = {
  id: "StoryViewer", status: "draft", group: "content",
  purpose: "Watch a person’s short-lived story and respond to the current slide.",
  pick: "Watch one person’s temporary multi-slide story with timed progress, stickers or quick replies. Not a static photo carousel (Gallery), a row of people’s stories (Stories), or a permanent Post.",
  writeHints: [
    'Each slide needs its own photo and time; current is a zero-based index into slides. For a read-only viewer use detail "brief"; leave detail null otherwise.',
    'A link sticker can have a goto; a poll sticker has two options. Use null for unrequested variant axes.',
  ],
  region: "body", weight: 3, dense: true, tier: "people",
  partTiers: { prev: "phone", next: "phone", story: "phone", close: "phone" },
  realPath: "Stories expire after 24 hours in a shared app; replies go to the author’s message thread.",
  variants: { aspect: ["tall", "square", "wide"], bleed: ["edge", "inset"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["reply", "react"] } },
  parts: ["root", "progress", "author", "avatar", "time", "photo", "caption", "prev", "next", "story", "sticker", "reply", "react", "close", "status"],
  items: { key: "slides", parts: [] },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { prev: ["press"], next: ["press"], story: ["pause", "play"], sticker: ["press"], reply: ["type", "send"], react: ["press"], close: ["dismiss"] },
    when: { reply: { detail: "full" }, react: { detail: "full" } },
  },
  emptyActions: ["close.dismiss"], loadingActions: ["close.dismiss"], successActions: ["close.dismiss"],
  sequence: { cursor: "current", steps: { previous: "prev", next: "next" }, controls: { part: "story", intervalMs: slideIntervalMs, start: { prop: "paused", equals: false } } },
  live: { text: { reply: { prop: "replyDraft", max: maxReply } } },
  hostCommands: { parts: {
    "sticker.press": { kind: "command", name: "story.sticker", input: ({ props }) => {
      const { slides, current } = props as z.output<typeof storyProps>;
      return slides[current]?.sticker ? { slide: current } : undefined;
    } },
    "reply.send": { kind: "command", name: "story.reply", input: ({ props }) => {
      const { replyDraft, current } = props as z.output<typeof storyProps>;
      return replyDraft?.trim() ? { slide: current, text: replyDraft.trim() } : undefined;
    } },
    "react.press": { kind: "command", name: "story.react", input: ({ props }) => ({ slide: Number(props.current) }) },
  } },
  read: storyViewerReading,
} as const satisfies c.Meta;

const sticker = z.strictObject({
  kind: z.enum(["poll", "link"]),
  label: c.text(40),
  options: z.array(c.text(20)).min(0).max(2).optional(),
  goto: c.screenId.optional(),
});
const slide = z.strictObject({
  photo: c.photo,
  time: c.text(12),
  caption: c.text(120).optional(),
  sticker: sticker.optional(),
});

const storyProps = z.strictObject({
  author: c.text(24),
  avatar: c.photo.optional(),
  slides: z.array(slide).min(1).max(maxSlides),
  current: z
    .int()
    .min(0)
    .max(maxSlides - 1)
    .default(0),
  paused: z.boolean().default(false),
  replyDraft: c.text(maxReply).optional(),
});

export const props = storyProps
  .extend(c.variantProps(meta.variants))
  .refine(({ slides, current }) => current < slides.length, { path: ["current"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const first = items[0];
  const photo = c.photo.safeParse(thing && `lib:${thing.type}`).data ?? "lib:item";
  const time = c.clip(c.wordsFor(lang).placeholderValue, 12);
  return {
    author: (first && c.titleOf(first, 24, thing)) || c.clip(c.placeholderTitle(0, lang), 24),
    slides: items.length
      ? items.map((item) => ({ photo, time, caption: c.detailOf(item, 120, thing) || undefined }))
      : [{ photo, time }],
  };
}

// prettier-ignore
export const examples = [
  { author: "Maya", avatar: "lib:people_maya", slides: [
    { photo: "lib:fern", time: "4 min ago", caption: "New fronds on the greenhouse fern." },
    { photo: "lib:plants", time: "2 min ago", caption: "Help pick the next cutting.",
      sticker: { kind: "poll", label: "Which cutting next?", options: ["Pothos", "Fern"] } },
  ] },
  { author: "Anna", aspect: "wide", bleed: "inset", detail: "brief", paused: true, current: 1, replyDraft: "See you there!", slides: [
    { photo: "lib:dogs", time: "1 hr ago" },
    { photo: "lib:park", time: "45 min ago", sticker: { kind: "link", label: "See the walking route", goto: "park_walk" } },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("StoryViewer");
export const probes = [
  choose(
    "Open Maya’s temporary update: show one timed photo slide at a time with progress across the top and a quick reply to the current slide.",
  ),
  choose(
    "Let me swipe through four permanent photos from my garden, one picture at a time. No timer, replies, or stickers.",
    "Gallery",
  ),
  write(
    "Make Maya’s story that disappears after a day. First show her fern from four minutes ago, then her greenhouse from two minutes ago. Let me reply to the slide I’m viewing.",
  ),
  {
    ...write(
      "Open Maya’s temporary story with two timed fern photos from today, but make the viewer read-only: hide quick replies and reactions.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Go to the next slide in Maya’s story.", { address: "s1/next", action: "press" }),
] satisfies c.Probe[];
