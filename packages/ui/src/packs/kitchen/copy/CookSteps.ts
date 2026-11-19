import { clockLine, stepLine, timerLabels } from "../../../catalog";

export const cookStepsLabels = {
  timer: "Cooking timer",
  next: "Next step",
  back: "Back",
  done: "Recipe complete",
  finished: "All steps finished.",
} as const;

/** Read only the instruction on screen, never the rest of the recipe. */
export function cookStepsReading(
  steps: readonly { text: string; uses: readonly string[]; minutes?: number | undefined }[],
  at: number,
): string[] {
  const step = steps[at - 1]!;
  return [
    stepLine(at, steps.length),
    JSON.stringify(step.text),
    ...(step.uses.length ? [JSON.stringify(step.uses.join(" · "))] : []),
    ...(step.minutes === undefined
      ? []
      : [
          JSON.stringify(cookStepsLabels.timer),
          clockLine(step.minutes * 60),
          JSON.stringify(timerLabels.start),
          JSON.stringify(timerLabels.stop),
        ]),
    JSON.stringify(cookStepsLabels.next),
    JSON.stringify(cookStepsLabels.back),
  ];
}
