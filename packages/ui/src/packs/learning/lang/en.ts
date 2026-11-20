export const en = {
  timetable: {
    picker: "Show first",
    days: {
      mon: { short: "mon", name: "Monday" },
      tue: { short: "tue", name: "Tuesday" },
      wed: { short: "wed", name: "Wednesday" },
      thu: { short: "thu", name: "Thursday" },
      fri: { short: "fri", name: "Friday" },
      sat: { short: "sat", name: "Saturday" },
      sun: { short: "sun", name: "Sunday" },
    },
    reading: (parts: readonly (string | undefined)[]) => parts.filter(Boolean).join(" · "),
  },
  quiz: {
    check: "Check answer",
    next: "Next question",
    type: "Type your answer",
    true: "True",
    false: "False",
    left: "Match from",
    right: "Match to",
    pickLeft: "Pick an item on the left.",
    pickRight: "Pick its match on the right.",
    photo: "Question photo",
    correct: "Correct",
    incorrect: "Not quite",
    solution: "Correct answer",
    progress: (at: string, count: string) => `Question ${at} of ${count}`,
    score: (right: string, count: string) => `${right} of ${count} correct`,
    keyed: (label: string, key: string) => `${key} · ${label}`,
    paired: (label: string, other: string) => `${label} (${other})`,
    pair: (left: string, right: string) => `${left} → ${right}`,
  },
};

export type LearningWords = typeof en;
