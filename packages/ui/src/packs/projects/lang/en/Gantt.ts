export const words = {
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
};
