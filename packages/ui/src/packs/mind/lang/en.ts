export const en = {
  editSleep: "Edit sleep times",
  entriesEmpty: "No journal entries yet",
  entryPhoto: "Journal photo",
  entryMood: ["Very low", "Low", "Okay", "Good", "Very good"] as const,
  entryTags: (tags: readonly string[]) => tags.join(" · "),
  entryLabel: (date: string, excerpt: string) => `${date} · ${excerpt}`,
  entrySkeleton: {
    month: "Journal entries",
    date: "Date of entry",
    excerpt: "The text of a journal entry will appear here.",
    tags: "Tags for this entry",
  },
};

export type MindWords = typeof en;
