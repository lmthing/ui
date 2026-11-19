import { healthWordsFor } from "../lang";
export const { exerciseLabels } = healthWordsFor();

/** Arrays and labelled result values must be present in the model's screen reading. */
export function exerciseReading(
  input: {
    muscles: readonly string[];
    cues: readonly string[];
    equipment?: string | undefined;
    best?: string | undefined;
    last?: string | undefined;
  },
  lang?: string,
): string[] {
  const { exerciseLabels, exerciseStart } = healthWordsFor(lang);
  return [
    `${exerciseLabels.muscles}: ${input.muscles.map((value) => JSON.stringify(value)).join(", ")}`,
    `${exerciseLabels.cues}: ${input.cues.map((value) => JSON.stringify(value)).join("; ")}`,
    ...(input.equipment ? [`${exerciseLabels.equipment}: ${JSON.stringify(input.equipment)}`] : []),
    ...(input.best ? [`${exerciseLabels.best}: ${input.best}`] : []),
    ...(input.last ? [`${exerciseLabels.last}: ${input.last}`] : []),
    exerciseStart(JSON.stringify(exerciseLabels.start)),
  ];
}
