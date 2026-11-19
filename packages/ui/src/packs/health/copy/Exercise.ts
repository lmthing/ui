export const exerciseLabels = {
  muscles: "Muscles",
  cues: "Form cues",
  equipment: "Equipment",
  best: "Best",
  last: "Last",
  start: "Add to workout",
} as const;

/** Arrays and labelled result values must be present in the model's screen reading. */
export function exerciseReading(input: {
  muscles: readonly string[];
  cues: readonly string[];
  equipment?: string | undefined;
  best?: string | undefined;
  last?: string | undefined;
}): string[] {
  return [
    `${exerciseLabels.muscles}: ${input.muscles.map((value) => JSON.stringify(value)).join(", ")}`,
    `${exerciseLabels.cues}: ${input.cues.map((value) => JSON.stringify(value)).join("; ")}`,
    ...(input.equipment ? [`${exerciseLabels.equipment}: ${JSON.stringify(input.equipment)}`] : []),
    ...(input.best ? [`${exerciseLabels.best}: ${input.best}`] : []),
    ...(input.last ? [`${exerciseLabels.last}: ${input.last}`] : []),
    `start button: ${JSON.stringify(exerciseLabels.start)}`,
  ];
}
