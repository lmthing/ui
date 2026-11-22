export const words = {
  projectStatus: {
    status: { on_track: "On track", at_risk: "At risk", blocked: "Blocked" },
    wins: "Wins",
    blockers: "Blockers",
    milestoneTitle: (title: string) => `Next milestone: ${title}`,
    update: "Post check-in",
    empty: "No status update posted yet",
    today: "Today",
    remaining: (days: string, single: boolean) => `${days} ${single ? "day" : "days"} left`,
    bullet: (text: string) => `• ${text}`,
    group: (heading: string, entries: string[]) => `${heading}: ${entries.join("; ")}`,
    separator: " · ",
  },
};
