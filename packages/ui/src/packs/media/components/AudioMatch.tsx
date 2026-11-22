import { z } from "zod";
import * as c from "../../../catalog";
import { audioMatchReading } from "../copy";

// Core first: Player/audio can play a known recording but cannot identify audio heard through the microphone.
export const meta = {
  id: "AudioMatch",
  status: "draft",
  group: "action",
  purpose: "Identify music playing nearby and revisit recent matches.",
  pick: "Identify an unknown song from ambient sound or humming through the microphone. Not playing a known recording (Player), typing a music search (Search), or checking pronunciation (SpeechCheck).",
  writeHints: [
    'Use style "listen" for recognition first, or "result" to foreground the identified track when available. Recognition happens after permission; never write a listening flag, result, or URL to pretend recognition already happened.',
    "Use an empty history for a new recognition screen. History titles and artist names must come from existing matches in the brief.",
  ],
  region: "body",
  weight: 2,
  tier: "ok",
  realPath:
    "The host requests microphone permission, captures a sample, and asks a recognition service to identify it.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["artwork", "photo"] } },
  parts: ["root", "listen", "open", "artwork", "title", "artist", "album", "status", "recent"],
  items: { key: "history", parts: ["root", "title", "artist", "photo", "matched_at"] },
  actions: { parts: { listen: ["start", "stop"], open: ["press"] }, items: { root: ["press"] } },
  partTiers: { listen: "service", open: "service" },
  confirmParts: ["open"],
  emptyActions: ["listen.start"],
  loadingActions: ["listen.stop"],
  successActions: ["listen.start", "open.press", "root.press"],
  errorActions: ["listen.start", "root.press"],
  readSuccess: true,
  states: ["empty", "filled", "loading", "success", "error"],
  read: (value, _state, lang): string[] =>
    audioMatchReading((value as { match?: z.output<typeof match> }).match, lang),
} as const satisfies c.Meta;

const match = z.strictObject({
  title: c.text(40),
  artist: c.text(32),
  album: c.text(32).optional(),
  photo: c.photo.optional(),
  url: c.text(120).optional(),
});
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  listening: z.boolean().default(false),
  match: match.optional(),
  history: z
    .array(
      z.strictObject({
        title: c.text(32),
        artist: c.text(24),
        photo: c.photo.optional(),
        matchedAt: c.text(12),
        goto: c.screenId.optional(),
      }),
    )
    .min(0)
    .max(6),
  style: z.enum(["listen", "result"]).default("listen"),
});

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { history: [] };
}

export const examples = [
  {
    history: [
      {
        title: "Glasshouse",
        artist: "The Ferns",
        matchedAt: "9:42 AM",
        photo: "lib:plants",
        goto: "glasshouse",
      },
      { title: "Late Light", artist: "Moss Radio", matchedAt: "Yesterday", photo: "lib:fern" },
    ],
  },
  {
    style: "result",
    match: {
      title: "Meet Me at the Gate",
      artist: "Clover Club",
      album: "Open Air",
      photo: "lib:dogs",
      url: "https://example.com/tracks/meet-me",
    },
    history: [
      { title: "The Long Way Home", artist: "Trot Ensemble", matchedAt: "Yesterday", goto: "long_way" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("AudioMatch");
export const probes = [
  choose(
    "What song is playing in the room? Give me a button that listens through the microphone and remembers what it finds",
  ),
  choose("I already have the recording saved. Play it with a pause button and a scrubber", "Player"),
  {
    ...write(
      "Give me a way to identify the song playing nearby using the microphone. There are no previous matches.",
    ),
    expectProps: { history: [] },
  },
  {
    ...write(
      "Give me a way to identify music through the microphone, without showing album artwork anywhere. There are no previous matches.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Open the earlier match called Glasshouse from the recent matches", {
    address: "a1/r1",
    action: "press",
  }),
] satisfies c.Probe[];
