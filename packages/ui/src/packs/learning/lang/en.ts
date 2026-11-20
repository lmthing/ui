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
};

export type LearningWords = typeof en;
