import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Player (audio) plays the reference but cannot record a learner's attempt or show word-level feedback.
export const meta = {
  id: "SpeechCheck",
  status: "draft",
  group: "input",
  tier: "ok",
  pick: "practising speaking aloud with microphone capture and pronunciation feedback. Not passive playback (Player), tap-or-type tests (Quiz), or open-ended AI chat (assistant AiThread).",
  purpose: "Practise saying a phrase aloud and see which words need another try.",
  region: "body",
  weight: 2,
  realPath:
    "microphone permission (ok) records spoken audio via the new Wave 6 KitMicCapture base, and a speech-evaluation service (evaluate) scores word accuracy and fluency.",
  parts: ["root", "listen", "mic", "evaluate", "retry"],
  items: { key: "words", parts: ["root"] },
  actions: {
    parts: { listen: ["play", "pause"], mic: ["start", "stop"], evaluate: ["press"], retry: ["press"] },
  },
  partTiers: { evaluate: "service" },
  states: ["filled", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  phrase: text(120),
  phonetic: text(120).optional(),
  translation: text(120).optional(),
  referenceAudio: text(120).optional(),
  words: z
    .array(z.strictObject({ text: text(24), status: z.enum(["correct", "close", "missed"]).optional() }))
    .min(1)
    .max(16),
  fluencyScore: z.number().min(0).max(100).optional(),
  style: z.enum(["phrase", "listen"]).default("phrase"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    phrase: castTitle(120, 0),
    words: Array.from({ length: 1 }, (_, index) => ({ text: castTitle(24, index) })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("SpeechCheck");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Player"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/listen", action: "play" }),
] satisfies Probe[];

export function SpeechCheck(_input: Props<typeof props, typeof meta>) {
  return null;
}
