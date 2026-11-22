export const words = {
  entriesEmpty: "No journal entries yet",
  entryPhoto: "Journal photo",
  entryMood: ["Very low", "Low", "Okay", "Good", "Very good"] as const,
  entryTags: (tags: readonly string[]) => tags.join(" · "),
  entryLabel: (date: string, excerpt: string) => `${date} · ${excerpt}`,
  entrySkeleton: {
    month: "Journal entries",
    prompt: "Journal prompt",
    date: "Date of entry",
    excerpt: "Journal entry preview",
    tags: "Tags for this entry",
  },
};
