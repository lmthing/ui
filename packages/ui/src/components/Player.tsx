import {
  useWords,
  KitCard,
  KitContent,
  KitMediaControls,
  KitPhoto,
  KitPlayback,
  KitRow,
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
  numberLine,
  photo,
  placeholderTitle,
  remainingLine,
  text,
  thingOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { prompt } from "../entry/prompt-Player.generated";

export const meta = {
  id: "Player",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A file stored on or bundled with the app, played by the device's media player.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["artwork"] } },
  parts: [
    "root",
    "artwork",
    "title",
    "sub",
    "scrubber",
    "elapsed",
    "remaining",
    "back",
    "play",
    "forward",
    "options",
  ],
  states: ["filled", "loading"],
  actions: {
    parts: { scrubber: ["seek"], back: ["press"], play: ["play", "pause"], forward: ["press"] },
  },
  read: (input, state, lang, _data, _currency, live): string[] => {
    if (state !== "filled") return [];
    const { at, seconds } = input as z.output<typeof props>,
      clock = live?.("scrubber"),
      playing = live?.("play");
    const here = typeof clock === "number" ? clock : (at ?? 0),
      w = wordsFor(lang).playbackOptions;
    const status =
      typeof playing === "boolean" || live?.("$runtime") === true
        ? playing
          ? w.playing
          : w.paused
        : undefined;
    return [
      clockLine(here, lang),
      remainingLine(seconds - here, lang),
      status,
      optionLines(input as PlayerProps, lang).join(" · "),
    ].filter((line): line is string => Boolean(line));
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["audio", "video", "compact"]).default("audio"),
    mode: z.enum(["audio", "music", "podcast", "video", "live"]).optional(),
    speed: z.number().min(0.25).max(4).optional(),
    liked: z.boolean().optional(),
    shuffle: z.boolean().optional(),
    repeat: z.boolean().optional(),
    loop: z.boolean().optional(),
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
  })
  .refine(({ mode, style }) => mode !== "video" || style !== "compact", {
    path: ["style"],
    message: "Compact is for audio only",
  })
  .overwrite((input) => (input.mode === "video" ? { ...input, style: "video" } : input));

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
  { ...voiceNote, title: "Park walk recap", style: "compact", mode: "podcast", speed: 1.5, liked: true },
  {
    style: "audio",
    mode: "music",
    media: "lib:park_walk",
    title: "Morning walk playlist",
    seconds: 182,
    shuffle: true,
    repeat: true,
    loop: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Player");
export const probes = [
  choose("Let me listen to a twelve minute evening meditation and scrub back and forth through it"),
  choose("Show the ten meditations I can pick from, each with its length, to tap one", "List"),
  write("Play the recording Evening wind-down by Guided breathing, 12 minutes long, already 4 minutes in"),
  write(
    "Play the 38-second Park walk recap from lib:voice_note explicitly as a podcast, with a single compact audio row. Use 1.5× speed, mark it liked and loop it. Leave shuffle and repeat off.",
  ),
  {
    ...write(
      "Play the 12-minute Evening wind-down recording from lib:wind_down. Keep lib:plants as its cover photo but hide the artwork, without changing the spacing or playback controls.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Pause the recording", { address: "p1/play", action: "pause" }),
] satisfies Probe[];

type PlayerProps = Props<typeof props, typeof meta>;

function optionLines({ mode, speed, liked, shuffle, repeat, loop }: PlayerProps, lang?: string) {
  const w = wordsFor(lang).playbackOptions;
  return [
    mode && w.mode[mode],
    speed !== undefined && w.speed(numberLine(speed, lang)),
    liked && w.liked,
    shuffle && w.shuffle,
    (loop ?? repeat) && w.loop,
  ].filter((line): line is string => typeof line === "string");
}

function playerLines(title: PlayerProps["title"], sub: PlayerProps["sub"], info: string) {
  return [
    { text: title, role: "heading" as const },
    ...(sub ? [{ text: sub, role: "body" as const }] : []),
    ...(info ? [{ text: info, role: "caption" as const }] : []),
  ];
}

type PlayerTitles = Pick<PlayerProps, "title" | "sub" | "density"> & {
  info: string;
  loading: boolean;
  compact: boolean;
  artwork: PlayerProps["photo"];
  lines: ReturnType<typeof playerLines>;
};

function playerTitles({ title, sub, info, loading, compact, artwork, density, lines }: PlayerTitles) {
  return loading ? (
    compact ? (
      <KitSkeleton
        items={[
          {
            lines: lines.map((line, i) => ({ ...line, role: i === 0 ? "body" : "caption" })),
            ...(artwork ? { photo: artwork } : {}),
          },
        ]}
        lead={artwork ? "box" : "none"}
        density={density}
      />
    ) : (
      <KitSkeleton shape="media" aspect="none" inset="none" {...{ density, lines }} />
    )
  ) : (
    <>
      <KitText role={compact ? "body" : "heading"} part="title" density={density}>
        {title}
      </KitText>
      {sub && (
        <KitText role={compact ? "caption" : "body"} tone="muted" part="sub" density={density}>
          {sub}
        </KitText>
      )}
      {info && (
        <KitText role="caption" tone="muted" part="options">
          {info}
        </KitText>
      )}
    </>
  );
}

type PlayerPosition = Pick<PlayerProps, "title" | "seconds" | "style"> & {
  here: number;
  lang: ReturnType<typeof useWords>["lang"];
  loading: boolean;
};

function playerPosition({ title, here, seconds, lang, loading, style }: PlayerPosition) {
  return loading ? (
    <>
      <KitSkeleton shape="control" kind="quiet" full label={title} />
      <KitSkeleton
        shape="figure"
        split
        inset="none"
        lines={[
          { text: clockLine(here, lang), role: "caption" },
          { text: remainingLine(seconds - here, lang), role: "caption", align: "end" },
        ]}
      />
    </>
  ) : (
    <>
      <KitSlider value={here} min={0} max={seconds} label={title} part="scrubber" />
      <KitTimes
        elapsed={clockLine(here, lang)}
        remaining={remainingLine(seconds - here, lang)}
        prominent={style !== "audio"}
      />
    </>
  );
}

function playerCover(
  title: string,
  artwork: PlayerProps["photo"],
  aspect: "wide" | "square",
  loading: boolean,
  compact: boolean,
) {
  if (loading) return compact ? null : <KitSkeleton shape="media" aspect="wide" inset="none" lines={[]} />;
  return (
    artwork && <KitPhoto photo={artwork} shape={compact ? "thumb" : aspect} part="artwork" label={title} />
  );
}

function playerAudioSkeleton(
  density: PlayerProps["density"],
  artwork: PlayerProps["photo"],
  lines: PlayerTitles["lines"],
) {
  return (
    <KitCard style="inset" padded density={density}>
      <KitSkeleton
        shape="media"
        inset="none"
        playback
        aspect={artwork ? "square" : "none"}
        {...{ density, lines }}
      />
    </KitCard>
  );
}

export function Player(input: PlayerProps) {
  const { style, title, sub, detail, photo: art, seconds, at, speed, loop, repeat } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const artwork = detail === "full" ? art : undefined;
  const aspect = style === "video" ? "wide" : "square";
  const {
    lang,
    words: { mediaLabels },
  } = useWords();
  const loading = useComponentState() === "loading";
  const compact = style === "compact";
  const here = at ?? 0;
  const info = optionLines(input, lang).join(" · ");
  const lines = playerLines(title, sub, info);
  if (loading && style === "audio") return playerAudioSkeleton(density, artwork, lines);
  const controls = <KitMediaControls labels={mediaLabels} compact={compact} />;
  const titles = playerTitles({ title, sub, info, loading, compact, artwork, density, lines });
  const position = playerPosition({ title, here, seconds, lang, loading, style });
  const cover = playerCover(title, artwork, aspect, loading, compact);
  const playback = { style, speed, loop: loop ?? repeat, loading };
  return (
    <KitCard style="inset" part="root" padded density={density}>
      {compact ? (
        <KitPlayback {...playback}>
          <KitRow
            label={title}
            leading={cover}
            leadingAlign="row"
            trailing={controls}
            inset="none"
            density={density}
          >
            <KitContent density={density} lineRole="body">
              {titles}
            </KitContent>
          </KitRow>
          {position}
        </KitPlayback>
      ) : (
        <>
          <KitPlayback {...playback} overlay={style === "video" ? controls : undefined}>
            {cover}
          </KitPlayback>
          <KitContent density={density}>{titles}</KitContent>
          {position}
          {style !== "video" && controls}
        </>
      )}
    </KitCard>
  );
}
