export const words = {
  tasks: {
    today: "Due today",
    todayEmpty: "No tasks due today",
    repeat: { daily: "Repeats daily", weekly: "Repeats weekly", monthly: "Repeats monthly" },
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
