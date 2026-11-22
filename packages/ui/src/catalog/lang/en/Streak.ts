export const words = {
  streakDone: (days: readonly string[]) => (days.length ? `done ${days.join(", ")}` : "none done this week"),
};
