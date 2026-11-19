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
  best?: string | undefined;
  last?: string | undefined;
}): string[] {
  return [
    `${exerciseLabels.muscles}: ${input.muscles.join(", ")}`,
    `${exerciseLabels.cues}: ${input.cues.join("; ")}`,
    ...(input.best ? [`${exerciseLabels.best}: ${input.best}`] : []),
    ...(input.last ? [`${exerciseLabels.last}: ${input.last}`] : []),
    exerciseLabels.start,
  ];
}
