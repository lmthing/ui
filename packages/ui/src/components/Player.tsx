import { z } from "zod";
import {
  clip,
  clockLine,
  mediaLabels,
  media,
  photo,
  placeholderTitle,
  remainingLine,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
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
} from "../kit";

export const meta = {
  id: "Player",
  group: "content",
  purpose: "Listen to or watch one recording, with play, skip and a scrubber.",
  pick: "One recording to listen to or watch now, such as a meditation, a lesson, an episode, an exercise video or a voice memo. Not a list of recordings to choose from (List), one picture (Photo), or timing an activity with no recording (Timer).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A file stored on or bundled with the app, played by the device's media player.",
  parts: ["root", "artwork", "title", "sub", "scrubber", "elapsed", "remaining", "back", "play", "forward"],
  states: ["filled", "loading"],
  actions: {
    parts: { scrubber: ["seek"], back: ["press"], play: ["play", "pause"], forward: ["press"] },
  },
  aliases: ["audio", "video", "podcast", "playback", "nowplaying"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { at, seconds } = input as z.output<typeof props>;
    return [clockLine(at ?? 0), remainingLine(seconds - (at ?? 0))];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["audio", "video", "compact"]).default("audio"),
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

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const tag = (thingOf(cast)?.type ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 40);
  return {
    style: "audio",
    media: `lib:${tag || "recording"}`,
    title: clip(thingOf(cast)?.type.trim() || placeholderTitle(0), 40),
    seconds: 60,
  };
}

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
  {
    style: "video",
    media: "lib:fern_care",
    title: "Repotting a fern",
    sub: "Two minute guide",
    photo: "lib:plants",
    seconds: 134,
  },
  { style: "compact", media: "lib:voice_note", title: "Voice note from Anna", seconds: 38, at: 12 },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Let me listen to a twelve minute evening meditation and scrub back and forth through it",
    expect: "Player",
  },
  {
    kind: "choose",
    need: "Show the ten meditations I can pick from, each with its length, to tap one",
    expect: "List",
  },
  {
    kind: "write",
    brief: "Play the recording Evening wind-down by Guided breathing, 12 minutes long, already 4 minutes in",
    expect: "Player",
  },
  {
    kind: "read",
    screen: 0,
    task: "Pause the recording",
    expect: { address: "p1/play", action: "pause" },
  },
] satisfies Probe[];

export function Player({ style, title, sub, photo: art, seconds, at }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const here = at ?? 0;
  if (state === "loading") {
    return (
      <KitCard style="inset" padded>
        <KitSkeleton shape="media" rows={1} lead="none" />
      </KitCard>
    );
  }
  const compact = style === "compact";
  return (
    <KitCard style="inset" part="root" padded>
      <KitPlayback style={style}>
        {art && !compact && (
          <KitPhoto photo={art} shape={style === "video" ? "wide" : "square"} part="artwork" label={title} />
        )}
      </KitPlayback>
      <KitContent>
        <KitText role="heading" part="title">
          {title}
        </KitText>
        {sub && (
          <KitText role="body" tone="muted" part="sub">
            {sub}
          </KitText>
        )}
      </KitContent>
      <KitSlider value={here} min={0} max={seconds} label={title} part="scrubber" />
      <KitTimes elapsed={clockLine(here)} remaining={remainingLine(seconds - here)} />
      <KitMediaControls labels={mediaLabels} />
    </KitCard>
  );
}
