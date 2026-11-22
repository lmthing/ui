export const words = {
  breathe: {
    phase: { inhale: "Breathe in", hold: "Hold", exhale: "Breathe out", rest: "Rest" },
    complete: "Complete",
    play: "Play",
    pause: "Pause",
    controlLabel: (action: string, phase: string) => `${action} breathing · ${phase}`,
    roundsLeft: (plural: Intl.LDMLPluralRule) => ({
      before: "",
      after: ` ${plural === "one" ? "round" : "rounds"} left`,
    }),
    grounding: {
      title: "Sensory grounding",
      next: "Next sense",
      finish: "Finish",
      done: "Grounding complete",
      cues: [
        "Look for five things.",
        "Feel four things.",
        "Listen for three sounds.",
        "Notice two things you smell.",
        "Notice one thing you taste.",
      ] as const,
    },
  },
};
