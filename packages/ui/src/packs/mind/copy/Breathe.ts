import { numberLine, pluralForm, stepLine } from "../../../catalog";
import { mindWordsFor } from "../lang";

const phases = ["inhale", "hold", "exhale", "rest"] as const;
export const groundingSteps = mindWordsFor().breathe.grounding.cues.length;
type Phase = (typeof phases)[number];
const presets = {
  box: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
  calm: { inhale: 4, hold: 7, exhale: 8, rest: 0 },
  even: { inhale: 5, hold: 0, exhale: 5, rest: 0 },
};
type BreathSeed = {
  pattern: keyof typeof presets | "custom";
  rounds: number;
} & { [K in Phase]?: number | undefined };

type Frame = { phase: Phase; progress: number; roundsLeft: number };

function timingsOf(seed: BreathSeed) {
  return seed.pattern === "custom" ? seed : presets[seed.pattern];
}

function roundSeconds(timings: ReturnType<typeof timingsOf>) {
  return phases.reduce((sum, phase) => sum + (timings[phase] ?? 0), 0);
}

export function breathSeconds(seed: BreathSeed): number {
  return roundSeconds(timingsOf(seed)) * seed.rounds;
}

/** Map elapsed seconds to the current phase and rounds, skipping zero-length phases. */
export function breathFrame(seed: BreathSeed, elapsed = 0): Frame {
  const timings = timingsOf(seed);
  const duration = roundSeconds(timings);
  const seconds = Math.max(0, elapsed);
  if (!duration || seconds >= duration * seed.rounds) return { phase: "rest", progress: 0, roundsLeft: 0 };
  const roundsLeft = seed.rounds - Math.floor(seconds / duration);
  let position = seconds % duration;
  for (const phase of phases) {
    const length = timings[phase] ?? 0;
    if (position < length) return { phase, progress: position / length, roundsLeft };
    position -= length;
  }
  return { phase: "rest", progress: 0, roundsLeft };
}

export function breathReading(frame: Frame, lang?: string): [phase: string, rounds: string] {
  const { cue, rounds } = breathCopy(frame, lang);
  return [cue, `${rounds.before}${rounds.count}${rounds.after}`];
}

export function breathCopy(frame: Frame, lang?: string) {
  const { phase, complete, roundsLeft } = mindWordsFor(lang).breathe;
  const count = frame.roundsLeft;
  return {
    cue: count ? phase[frame.phase] : complete,
    rounds: { ...roundsLeft(pluralForm(count, lang)), count: numberLine(count, lang) },
  };
}

export function groundingCopy(index: number, lang?: string) {
  const { title, cues, next, finish, done } = mindWordsFor(lang).breathe.grounding;
  const cue = cues[index];
  if (!cue) return { title, cue: done };
  const step = stepLine(index + 1, groundingSteps, lang);
  const count = numberLine(index + 1, lang);
  const at = step.indexOf(count);
  return {
    title,
    cue,
    step,
    progress: { before: step.slice(0, at), count, after: step.slice(at + count.length) },
    next: index + 1 === groundingSteps ? finish : next,
  };
}
