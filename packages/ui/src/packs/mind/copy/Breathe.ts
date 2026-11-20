import { numberLine, pluralForm } from "../../../catalog";
import { mindWordsFor } from "../lang";

const phases = ["inhale", "hold", "exhale", "rest"] as const;
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

/** Map elapsed seconds to the current phase and rounds, skipping zero-length phases. */
export function breathFrame(seed: BreathSeed, elapsed = 0): Frame {
  const timings = seed.pattern === "custom" ? seed : presets[seed.pattern];
  const duration = phases.reduce((sum, phase) => sum + (timings[phase] ?? 0), 0);
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

export function breathReading(frame: Frame, lang?: string): string[] {
  const { phase, complete, roundsLeft } = mindWordsFor(lang).breathe;
  const count = frame.roundsLeft;
  const rounds = roundsLeft(numberLine(count, lang), pluralForm(count, lang));
  return [count ? phase[frame.phase] : complete, rounds];
}
