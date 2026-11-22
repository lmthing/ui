export const words = {
  milestones: {
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    reached: (date: string) => `Reached ${date}`,
    requires: (titles: string[]) => `Requires: ${titles.join(", ")}`,
    missing: (titles: string[]) => `Still needed: ${titles.join(", ")}`,
    ref: (ref: string) => ref.replaceAll("_", " "),
    separator: " · ",
  },
};
