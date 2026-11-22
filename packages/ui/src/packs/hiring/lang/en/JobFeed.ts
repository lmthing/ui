export const words = {
  jobFeed: {
    empty: "No open jobs to show",
    success: "Bookmark updated",
    error: "Couldn’t load job openings",
    save: "Save",
    saved: "Saved",
    saveJob: (title: string) => `Save ${title}`,
    unsaveJob: (title: string) => `Remove bookmark for ${title}`,
    apply: "Apply",
    applyFor: (title: string) => `Apply for ${title}`,
    easyApply: "Easy apply",
    postedToday: "Posted today",
    postedAgo: (age: string) => `Posted ${age}`,
    postedOn: (date: string) => `Posted ${date}`,
  },
};
