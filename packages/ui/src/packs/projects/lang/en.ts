export const en = {
  gantt: {
    range: "Timeline scale",
    week: "Days",
    month: "Weeks",
    details: "Schedule details",
    entries: "Tasks and milestones",
    noDates: "No scheduled dates in this range",
    outside: "Outside the shown range",
    after: (titles: string[]) => `After ${titles.join(", ")}`,
    conflict: "Starts before a dependency finishes",
    dates: (start: string, end: string) => (start === end ? start : `${start} – ${end}`),
    clipped: (title: string) => `${title}…`,
    separator: " · ",
  },
  milestones: {
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    reached: (date: string) => `Reached ${date}`,
    requires: (titles: string[]) => `Requires: ${titles.join(", ")}`,
    missing: (titles: string[]) => `Still needed: ${titles.join(", ")}`,
    ref: (ref: string) => ref.replaceAll("_", " "),
    separator: " · ",
  },
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
