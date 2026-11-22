import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { storyViewerReading } from "../copy";
import { socialWordsFor } from "../lang";
import { StoryProgress } from "./story-progress";

const maxSlides = 8,
  maxReply = 120,
  slideIntervalMs = 5000;
const availabilityKind = "social_story_availability";
const availability = z.strictObject({ component: c.screenId, expired: z.literal(true) });

// Core first: Gallery/carousel browses static photos, not timed stories with slide replies or stickers.
// prettier-ignore
export const meta = {
  id: "StoryViewer", status: "ready", group: "content",
  purpose: "Watch a person’s short-lived story and respond to the current slide.",
  pick: "Watch one person’s temporary multi-slide story with timed progress, stickers or quick replies. Not a static photo carousel (Gallery), a row of people’s stories (Stories), or a permanent Post.",
  writeHints: [
    'Each slide needs its own photo and time; current is a zero-based index into slides. For a read-only viewer use detail "brief"; leave detail null otherwise.',
    'A link sticker can have a goto; a poll sticker can have up to two options. Use null for unrequested variant axes, including aspect and bleed.',
  ],
  region: "body", weight: 3, dense: true, tier: "people",
  partTiers: { prev: "phone", next: "phone", story: "phone", close: "phone" },
  realPath: "Stories expire after 24 hours in a shared app; replies go to the author’s message thread.",
  variants: { aspect: ["tall", "square", "wide"], bleed: ["edge", "inset"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["reply", "send", "react"] } },
  parts: ["root", "progress", "position", "author", "avatar", "time", "photo", "caption", "prev", "next", "story", "sticker", "reply", "send", "react", "close", "status"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { prev: ["press"], next: ["press"], story: ["pause", "play"], sticker: ["press"], reply: ["type"], send: ["send"], react: ["press"], close: ["dismiss"] },
    when: { reply: { detail: "full" }, send: { detail: "full" }, react: { detail: "full" } },
  },
  emptyActions: ["close.dismiss"], loadingActions: ["close.dismiss"], successActions: ["close.dismiss"],
  sequence: { cursor: "current", count: "slideCount", steps: { previous: "prev", next: "next" }, controls: { part: "story", intervalMs: slideIntervalMs, start: { prop: "paused", equals: false } } },
  deviceData: [availabilityKind],
  previewDeviceData: ({ state }) => state === "empty" ? { [availabilityKind]: [{ component: "c1", expired: true }] } : {},
  live: {
    text: { reply: { prop: "replyDraft", max: maxReply } },
    derive: ({ slides }, instance, data) => ({
      slideCount: Array.isArray(slides) ? slides.length : 0,
      ...(data[availabilityKind]?.some((row) => availability.safeParse(row).data?.component === instance) && { state: "empty" }),
    }),
  },
  hostCommands: { parts: {
    "sticker.press": { kind: "command", name: "story.sticker", input: ({ props }) => {
      const { slides, current } = props as z.output<typeof storyProps>;
      const sticker = slides[current]?.sticker;
      return sticker ? { slide: current, kind: sticker.kind, ...(sticker.kind === "link" && sticker.goto ? { destination: sticker.goto } : {}) } : undefined;
    } },
    "send.send": { kind: "command", name: "story.reply", input: ({ props }) => {
      const { replyDraft, current } = props as z.output<typeof storyProps>;
      return replyDraft?.trim() ? { slide: current, text: replyDraft.trim() } : undefined;
    } },
    "react.press": { kind: "command", name: "story.react", input: ({ props }) => ({ slide: Number(props.current) }) },
  } },
  readSuccess: true, read: storyViewerReading,
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
  author: c.text(24).meta({ read: false }),
  avatar: c.photo.optional().meta({ read: false }),
  slides: z.array(slide).min(1).max(maxSlides),
  current: z
    .int()
    .min(0)
    .max(maxSlides - 1)
    .default(0),
  paused: z.boolean().default(false),
  replyDraft: c.text(maxReply).optional().meta({ read: false }),
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
    { photo: "lib:fern", time: "4 min ago", caption: "New fronds on the greenhouse fern.",
      sticker: { kind: "poll", label: "Which cutting next?", options: ["Pothos", "Fern"] } },
    { photo: "lib:plants", time: "2 min ago", caption: "The next batch is ready to share." },
  ] },
  { author: "Anna", aspect: "wide", paused: true, current: 1, replyDraft: "See you there!", slides: [
    { photo: "lib:dogs", time: "1 hr ago" },
    { photo: "lib:park", time: "45 min ago", sticker: { kind: "link", label: "See the walking route", goto: "park_walk" } },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("StoryViewer");
// prettier-ignore
export const probes = [
  choose("Open Maya’s temporary update: show one timed photo slide at a time with progress across the top and a quick reply to the current slide."),
  choose("Show the whole album as a browsable gallery of four saved garden photos. Keep every photo in the set and let me move between them with previous and next arrows. Not a single featured photo or a card stack to sort. No timer, replies or stickers.", "Gallery"),
  write("Make Maya’s story that disappears after a day. First show her fern from four minutes ago, then her greenhouse from two minutes ago. Let me reply to the slide I’m viewing."),
  {
    ...write("Open Maya’s temporary story with two timed fern photos from today. Hide quick replies and reactions. Keep the crop and edge treatment at their defaults: leave aspect and bleed unset."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Go to the next slide in Maya’s story.", { address: "s1/next", action: "press" }),
] satisfies c.Probe[];

type StoryProps = c.Props<typeof props, typeof meta>;
type StoryLive = StoryProps & { state?: "empty" };
type StoryWords = ReturnType<typeof socialWordsFor>["storyViewer"];

// prettier-ignore
function StoryNavigation({ current, count, position, words }: {
  current: number; count: number; position: string; words: StoryWords;
}) {
  return <kit.KitRow part="story" label={position} inline trailing={<>
      <kit.KitAction part="prev" icon="chevron_left" kind="quiet" action="press" a11y={words.previous} disabled={current === 0} contentParts={{}} />
      <kit.KitAction part="next" icon="chevron_right" kind="quiet" action="press" contentParts={{}} a11y={current === count - 1 ? words.playback : words.next}
        holdToPause={{ part: "story", playingLabel: words.playing, pausedLabel: words.paused, pauseLabel: words.pause, resumeLabel: words.play }} />
    </>}>
    <kit.KitLayoutText line={{ role: "meta", tone: "muted", text: position, part: "position" }} />
  </kit.KitRow>;
}

// prettier-ignore
function StoryReply({ words, draft }: { words: StoryWords; draft: string | undefined }) {
  const status = kit.useHostOperations().find(({ name }) => name === "story.reply")?.status;
  return <kit.KitContent group="response"><kit.KitGrid fitLast>
    <kit.KitInput part="reply" hint={words.reply} value={draft} action="type" projected compact />
    <kit.KitRow part={null} label={words.reply} inline trailing={<>
      <kit.KitAction part="send" icon="send" a11y={words.send} action="send" disabled={!draft?.trim()} contentParts={{}} />
      <kit.KitAction part="react" icon="heart" kind="quiet" a11y={words.react} action="press" contentParts={{}} />
    </>}>{null}</kit.KitRow>
  </kit.KitGrid>
    {status === "accepted" && <kit.KitLayoutText line={{ part: "status", role: "meta", tone: "good", text: words.sent }} />}
    {status === "pending" && <kit.KitLayoutText line={{ part: "status", role: "meta", tone: "muted", text: words.sending }} />}
    {status === "rejected" && <kit.KitLayoutText line={{ part: "status", role: "meta", tone: "bad", text: words.notSent }} />}
  </kit.KitContent>;
}

// prettier-ignore
export function StoryViewer(input: StoryProps) {
  const scope = kit.usePartContext(), live = kit.useLiveControls(meta, input) as StoryLive;
  const state = live.state ?? scope.state;
  const { lang, words: { storyViewer: words } } = kit.useWords(socialWordsFor);
  const { current, slides, replyDraft } = live;
  const aspect = kit.useVariant("aspect", meta.variants.aspect, input.aspect), bleed = kit.useVariant("bleed", meta.variants.bleed, input.bleed);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const slide = slides[current], loading = state === "loading";
  const position = words.position(c.numberLine(current + 1, lang), c.numberLine(slides.length, lang));
  const close = <kit.KitAction part="close" icon="close" a11y={words.close} action="dismiss" kind="quiet" contentParts={{}} />;
  const controls = <kit.KitContent inset="md">
    <StoryNavigation {...{ current, position, words }} count={slides.length} />
    <kit.KitLayoutText line={{ text: slide?.caption, part: "caption" }} />
    {slide?.sticker && <kit.KitAction part="sticker" kind="secondary" action="press" label={slide.sticker.label}
      icon={slide.sticker.kind === "link" ? "link" : "bar_chart"} contentParts={{}} />}
    {detail === "full" && <StoryReply words={words} draft={replyDraft} />}
  </kit.KitContent>;
  const header = slide && <kit.KitContent inset="md">
      <StoryProgress count={slides.length} at={current + 1} interval={slideIntervalMs} loading={loading} />
      <kit.KitGrid fitLast>
        <kit.KitContent leadingAlign="row" lead={<kit.KitPhoto part="avatar" photo={input.avatar} shape="round" label={input.author}
          initials={input.author.slice(0, 1)} loading={loading} />}>
          <kit.KitMetaLine title={{ role: "body", strong: true, part: "author", text: input.author }} meta={{ part: "time", text: slide.time }} />
        </kit.KitContent>
        {close}
      </kit.KitGrid></kit.KitContent>;
  const body = slide && <>
    <kit.KitContent inset={bleed === "inset" ? "md" : "none"}>
      <kit.KitPhoto part="photo" photo={slide.photo} aspect={aspect} label={slide.caption ?? words.photo(position)} loading={loading} />
    </kit.KitContent>{controls}</>;
  return <kit.PartScope {...scope} state={state}><kit.KitCard bleed={bleed} part="root" padded inset="none" clip>
    {state === "filled" || loading ? header : <kit.KitContent inset="md"><kit.KitGrid fitLast><>{null}</>{close}</kit.KitGrid></kit.KitContent>}
    <kit.KitState part="status" icon={state === "empty" ? "clock" : undefined}
      message={state === "success" ? words.sent : words.expired} loading={body}>{body}</kit.KitState>
  </kit.KitCard></kit.PartScope>;
}
