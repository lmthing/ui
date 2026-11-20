export const en = {
  path: {
    status: { done: "Completed", current: "Start unit", locked: "Locked" },
    milestone: "Badge",
    separator: " · ",
    label: (title: string, status: string, milestone?: string) =>
      [title, status, milestone].filter(Boolean).join(" · "),
  },
};

export type LearningWords = typeof en;
