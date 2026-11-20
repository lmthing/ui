import {
  useWords,
  KitCard,
  KitContent,
  KitMediaControls,
  KitPhoto,
  KitPlayback,
  KitSkeleton,
  KitSlider,
  KitText,
  KitTimes,
  useComponentState,
  useVariant,
} from "../kit";
import { z } from "zod";
import {
  probesFor,
  clip,
  clockLine,
  media,
  photo,
  placeholderTitle,
  remainingLine,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";

export const meta = {
  id: "Player",
  group: "content",
  purpose: "Listen to or watch one recording, with play, skip and a scrubber.",
  pick: "One recording to listen to or watch now, such as a meditation, a lesson, an episode, an exercise video or a voice memo. Not a list of recordings to choose from (List), one picture (Photo), or timing an activity with no recording (Timer).",
  writeHints: [
    'Hiding only the cover artwork sets detail "brief" and density null. Keep the photo reference and playback controls. Never output default axis values; density is compact only when tighter spacing was specifically requested.',
    'The media field is the recording reference, not a presentation choice. Use style "video" only for a video recording.',
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A file stored on or bundled with the app, played by the device's media player.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["artwork"] } },
  parts: ["root", "artwork", "title", "sub", "scrubber", "elapsed", "remaining", "back", "play", "forward"],
  states: ["filled", "loading"],
  actions: {
    parts: { scrubber: ["seek"], back: ["press"], play: ["play", "pause"], forward: ["press"] },
  },
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { at, seconds } = input as z.output<typeof props>;
    return [clockLine(at ?? 0, lang), remainingLine(seconds - (at ?? 0), lang)];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["audio", "video"]).default("audio"),
    media,
    title: text(40),
    sub: text(40).optional(),
    photo: photo.optional(),
    seconds: z.int().min(1).max(36000),
    at: z.int().min(0).optional(),
  })
  .refine(({ at, seconds }) => at === undefined || at <= seconds, {
    path: ["at"],
    message: "Cannot start past the end",
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const tag = (thingOf(cast)?.type ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 40);
  return {
    style: "audio",
    media: `lib:${tag || "recording"}`,
    title: clip(thingOf(cast)?.type.trim() || placeholderTitle(0, lang), 40),
    seconds: 60,
  };
}

const fernGuide = {
  style: "video",
  media: "lib:fern_care",
  title: "Repotting a fern",
  sub: "Two minute guide",
  photo: "lib:fern_care",
  seconds: 134,
} as const;
const voiceNote = {
  style: "audio",
  media: "lib:voice_note",
  title: "Voice note from Anna",
  photo: "lib:anna",
  seconds: 38,
  at: 12,
} as const;
export const examples = [
  {
    style: "audio",
    media: "lib:wind_down",
    title: "Evening wind-down",
    sub: "Guided breathing",
    photo: "lib:plants",
    seconds: 720,
    at: 245,
  },
  fernGuide,
  { ...voiceNote, detail: "brief" },
  voiceNote,
  { ...fernGuide, density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Player");
export const probes = [
  choose("Let me listen to a twelve minute evening meditation and scrub back and forth through it"),
  choose("Show the ten meditations I can pick from, each with its length, to tap one", "List"),
  write("Play the recording Evening wind-down by Guided breathing, 12 minutes long, already 4 minutes in"),
  {
    ...write(
      "Play the 12-minute Evening wind-down recording from lib:wind_down. Keep lib:plants as its cover photo but hide the artwork, without changing the spacing or playback controls.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Pause the recording", { address: "p1/play", action: "pause" }),
] satisfies Probe[];

export function Player(input: Props<typeof props, typeof meta>) {
  const { style, title, sub, detail, photo: art, seconds, at } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const artwork = detail === "full" ? art : undefined;
  const aspect = style === "video" ? "wide" : "square";
  const { lang, words } = useWords();
  const { mediaLabels } = words;
  const state = useComponentState();
  const here = at ?? 0;
  if (state === "loading") {
    return (
      <KitCard style="inset" padded density={density}>
        <KitSkeleton
          shape="media"
          inset="none"
          playback
          aspect={artwork ? aspect : "none"}
          density={density}
          lines={[{ text: title, role: "heading" }, ...(sub ? [{ text: sub, role: "body" as const }] : [])]}
        />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded density={density}>
      <KitPlayback style={style}>
        {artwork && <KitPhoto photo={artwork} shape={aspect} part="artwork" label={title} />}
      </KitPlayback>
      <KitContent density={density}>
        <KitText role="heading" part="title" density={density}>
          {title}
        </KitText>
        {sub && (
          <KitText role="body" tone="muted" part="sub" density={density}>
            {sub}
          </KitText>
        )}
      </KitContent>
      <KitSlider value={here} min={0} max={seconds} label={title} part="scrubber" />
      <KitTimes elapsed={clockLine(here, lang)} remaining={remainingLine(seconds - here, lang)} />
      <KitMediaControls labels={mediaLabels} />
    </KitCard>
  );
}
