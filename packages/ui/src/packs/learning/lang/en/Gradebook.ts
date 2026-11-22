export const words = {
  gradebook: {
    empty: "No graded coursework yet",
    error: "Check category weights and scores.",
    ungraded: "Not graded",
    letter: ["A", "B", "C", "D", "F"] as const,
    gpa: (value: string) => `${value} GPA`,
    figures: (values: readonly string[]) => values.join(" · "),
    score: (earned: string, possible: string) => `${earned} / ${possible}`,
    weight: (label: string, value: string) => `${label} · ${value}`,
    categoryReading: (label: string, amount: string) => `${label}: ${amount}`,
    itemReading: (title: string, score: string, date?: string) =>
      [title, score, date].filter(Boolean).join(" · "),
  },
};
