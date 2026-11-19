/** The prefilled requests. Typed text that matches none of these is replayed from the closest recording. */
export const suggestions = [
  "a plant care app",
  "a dog walking business",
  "a weekly meal planner",
  "a workout log",
];

export const isSuggestion = (request: string) => suggestions.some((s) => s === request.trim().toLowerCase());
