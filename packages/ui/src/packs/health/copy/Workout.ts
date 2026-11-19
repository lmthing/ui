import { clockLine, numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

type Set = {
  done: boolean;
  weight?: number | undefined;
  reps?: number | undefined;
  seconds?: number | undefined;
  remaining?: number | undefined;
};
type Workout = {
  exercises: readonly { name: string; sets: readonly Set[] }[];
  unit: "kg" | "lb";
  rest: number;
  elapsed?: number | undefined;
};

export function activeWorkoutRest(
  exercises: readonly { id: string; sets: readonly Set[] }[],
  running?: (id: string, pos: number) => boolean,
) {
  for (const { id, sets } of exercises) {
    const at = sets.findIndex(
      (set, index) => (set.remaining ?? 0) > 0 && (running?.(id, index + 1) ?? set.done),
    );
    if (at >= 0) return { id, pos: at + 1 };
  }
  return undefined;
}

export function workoutSetTimes(set: Set, lang?: string): [part: "duration" | "remaining", line: string][] {
  const words = healthWordsFor(lang).workout;
  const times: ReturnType<typeof workoutSetTimes> = [];
  if (set.seconds !== undefined) times.push(["duration", words.duration(clockLine(set.seconds, lang))]);
  if (set.done && set.remaining !== undefined && set.remaining > 0)
    times.push(["remaining", words.remaining(clockLine(set.remaining, lang))]);
  return times;
}

export function workoutSetLabel(position: number, seconds?: number, lang?: string) {
  const words = healthWordsFor(lang).workout;
  const label = words.set(numberLine(position, lang));
  return seconds === undefined ? label : words.timedSet(label, clockLine(seconds, lang));
}

export function workoutReading(input: Workout, lang?: string): string[] {
  const words = healthWordsFor(lang).workout;
  const weightLabel = words.weight(words.units[input.unit]);
  return [
    words.timeLine(clockLine(input.elapsed ?? 0, lang)),
    ...input.exercises.flatMap(({ name, sets }) =>
      sets.map((set, at) =>
        [
          name,
          workoutSetLabel(at + 1, set.seconds, lang),
          `${weightLabel}${set.weight === undefined ? "" : ` ${numberLine(set.weight, lang)}`}`,
          `${words.reps}${set.reps === undefined ? "" : ` ${numberLine(set.reps, lang)}`}`,
          set.done ? words.done : words.pending,
          ...workoutSetTimes(set, lang).map(([, line]) => line),
        ].join(" · "),
      ),
    ),
    ...(input.rest > 0 ? [words.stopRest] : []),
    words.finish,
  ];
}
