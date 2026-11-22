export const words = {
  path: {
    status: { done: "Completed", current: "Start unit", locked: "Locked" },
    milestone: "Badge",
    separator: " · ",
    label: (title: string, status: string, milestone?: string) =>
      [title, status, milestone].filter(Boolean).join(" · "),
  },
};
