import { z } from "zod";
import * as c from "../../../catalog";
import { learningWordsFor } from "../lang";

export const speechWordStatus = z.enum(["correct", "close", "missed"]);
export const speechFluencyScore = z.number().min(0).max(100);
export const speechWordLimit = 16;
const speechAttempts = "speech_attempts";
export { speechAttempts };
const attempt = z.discriminatedUnion("phase", [
  z.strictObject({
    instance: c.screenId,
    phrase: c.text(120),
    phase: z.enum(["idle", "recording", "recorded", "denied", "unclear"]),
    level: z.number().min(0).max(1).optional(),
    elapsedSeconds: z.int().min(0).max(3600).optional(),
  }),
  z.strictObject({
    instance: c.screenId,
    phrase: c.text(120),
    phase: z.literal("scored"),
    score: speechFluencyScore,
    statuses: z.array(speechWordStatus).min(1).max(speechWordLimit),
    passed: z.boolean(),
  }),
]);

// A host publishes only the current attempt's presentation data. Audio stays with the adapter.
function findAttempt(input: c.Values, instance: string, data: c.DeviceData) {
  const matches = (data[speechAttempts] ?? []).filter(
    (row) =>
      row &&
      typeof row === "object" &&
      "instance" in row &&
      row.instance === instance &&
      "phrase" in row &&
      row.phrase === input.phrase,
  );
  if (matches.length !== 1) return;
  const parsed = attempt.safeParse(matches[0]);
  if (parsed.success) return parsed.data;
}

type WordStatus = z.infer<typeof speechWordStatus>;
type Word = { id: string; text: string; status?: WordStatus | undefined };
type Words = ReturnType<typeof learningWordsFor>["speechCheck"];

export const speechReveal = c.defineLocalState({
  schema: z.strictObject({ phrase: c.text(120), revealed: z.boolean() }),
  initial: ({ phrase }) => ({ phrase: String(phrase), revealed: false }),
  events: ["reveal.press"],
  reduce: (state) => ({ state: { ...state, revealed: true } }),
  project: ({ revealed }) => ({ revealed }),
});

export function projectSpeechCheck(input: c.Values, instance: string, data: c.DeviceData) {
  const take = findAttempt(input, instance, data);
  const words = input.words as Word[];
  const scored = take?.phase === "scored" && take.statuses.length === words.length ? take : undefined;
  const score = take ? scored?.score : (input.fluencyScore as number | undefined);
  const results = words.map((word, i) => (take ? { ...word, status: scored?.statuses[i] } : word));
  const hasResult = score !== undefined || results.some(({ status }) => status !== undefined);
  const phase = take?.phase;
  const recorded = phase === "recorded" || (phase === "scored" && Boolean(scored)) || phase === "unclear";
  const showPhrase = input.style !== "listen" || input.revealed === true || recorded || hasResult;
  const showHints = showPhrase && input.detail !== "brief";
  const outcome = scored?.passed
    ? "success"
    : phase === "denied"
      ? "denied"
      : phase === "unclear"
        ? "error"
        : undefined;
  return {
    targetPhrase: input.phrase,
    phrase: showPhrase ? input.phrase : undefined,
    phonetic: showHints ? input.phonetic : undefined,
    translation: showHints ? input.translation : undefined,
    words: results,
    fluencyScore: score,
    showWords: showPhrase && hasResult,
    hasReference: Boolean(input.referenceAudio),
    canReveal: !showPhrase,
    canEvaluate: phase === "recorded",
    canRetry: recorded || hasResult || phase === "denied",
    canCapture: !recorded && !hasResult,
    recording: phase === "recording",
    level: take && "level" in take ? (take.level ?? 0) : 0,
    elapsedSeconds: take && "elapsedSeconds" in take ? take.elapsedSeconds : undefined,
    outcome,
  };
}

export function speechWordLine(text: string, status: WordStatus | undefined, words: Words) {
  return status ? words.wordResult(text, words.wordStatus[status]) : text;
}

export function speechScoreLine(score: number, lang?: string) {
  return c.percentLine(score, 100, lang);
}

export function speechMatchedLine(rows: readonly Word[], lang?: string) {
  const count = rows.filter(({ status }) => status === "correct").length;
  return learningWordsFor(lang).speechCheck.matched(
    c.numberLine(count, lang),
    c.numberLine(rows.length, lang),
  );
}

export const readSpeechCheck: NonNullable<c.Meta["read"]> = (
  input,
  state,
  lang,
  _data,
  _currency,
  control,
) => {
  const live = input as ReturnType<typeof projectSpeechCheck>;
  const words = learningWordsFor(lang).speechCheck;
  const playback = control?.(c.clipKey("listen"));
  return [
    words.label,
    ...(live.canReveal ? [words.audioFirst, words.reveal] : []),
    live.hasReference ? (playback === true ? words.pause : words.listen) : undefined,
    playback === "error" ? words.audioUnavailable : undefined,
    live.canCapture ? (live.recording ? words.stopMic : words.mic) : undefined,
    live.canCapture && !control?.("$runtime") ? c.wordsFor(lang).mediaUnavailable : undefined,
    live.elapsedSeconds === undefined ? undefined : c.clockLine(live.elapsedSeconds, lang),
    live.canEvaluate ? words.recorded : undefined,
    state === "success" || live.outcome === "success" ? words.success : undefined,
    live.outcome === "denied" ? words.denied : live.outcome === "error" ? words.error : undefined,
    ...(live.showWords
      ? [
          speechMatchedLine(live.words, lang),
          ...live.words.map(({ text, status }) => speechWordLine(text, status, words)),
        ]
      : []),
    live.fluencyScore === undefined
      ? undefined
      : words.scoreReading(speechScoreLine(live.fluencyScore, lang)),
  ].filter((line): line is string => line !== undefined);
};
