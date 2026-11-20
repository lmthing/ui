import { kitchenWordsFor } from "../lang";
import { balancedLine, clockLine, stepLine, wordsFor } from "../../../catalog";

export const cookStepText = balancedLine;
export const cookStepUses = (uses: readonly string[], lang?: string): string =>
  kitchenWordsFor(lang).cookStepUses(uses);

export const { cookStepsLabels } = kitchenWordsFor();

/** Read only the instruction on screen, never the rest of the recipe. */
export function cookStepsReading(
  steps: readonly { text: string; uses: readonly string[]; minutes?: number | undefined }[],
  at: number,
  lang?: string,
  detail: "full" | "brief" = "full",
): string[] {
  const { cookStepsLabels } = kitchenWordsFor(lang);
  const { timerLabels } = wordsFor(lang);
  const step = steps[at - 1]!;
  return [
    stepLine(at, steps.length, lang),
    JSON.stringify(cookStepText(step.text)),
    ...(detail === "full" && step.uses.length ? [JSON.stringify(cookStepUses(step.uses, lang))] : []),
    ...(step.minutes === undefined
      ? []
      : [
          JSON.stringify(cookStepsLabels.timer),
          clockLine(step.minutes * 60, lang),
          JSON.stringify(timerLabels.start),
          JSON.stringify(timerLabels.stop),
        ]),
    JSON.stringify(cookStepsLabels.next),
    JSON.stringify(cookStepsLabels.back),
  ];
}
