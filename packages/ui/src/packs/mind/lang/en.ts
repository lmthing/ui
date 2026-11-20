export const en = {
  editSleep: "Edit sleep times",
  breathe: {
    phase: { inhale: "Breathe in", hold: "Hold", exhale: "Breathe out", rest: "Rest" },
    complete: "Exercise complete",
    roundsLeft: (count: string, plural: Intl.LDMLPluralRule) =>
      `${count} ${plural === "one" ? "round" : "rounds"} left`,
  },
};

export type MindWords = typeof en;
