export const en = {
  tasks: {
    assign: (title: string) => `Assign ${title}`,
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    blockers: (titles: string[]) => `Blocked by ${titles.join(", ")}`,
    done: (title: string) => `Complete ${title}`,
    project: (ref: string) => ref.charAt(0).toUpperCase() + ref.slice(1).replaceAll("_", " "),
    state: { todo: "To do", doing: "In progress", done: "Done" },
    priority: { low: "Low priority", normal: "Normal priority", high: "High priority" },
    separator: " · ",
  },
};

export type ProjectsWords = typeof en;
