export const en = {
  assignments: {
    handedIn: "Handed in?",
    graded: "Work graded",
    dueToday: (date: string) => `Today · ${date}`,
    dueIn: (days: string, plural: Intl.LDMLPluralRule, date: string) =>
      `In ${days}\u00a0${plural === "one" ? "day" : "days"} · ${date}`,
    dueOn: (date: string) => `Due ${date}`,
    deadlinePassed: (date: string) => `Deadline passed · ${date}`,
    handInLabel: (title: string) => `${title}: handed in`,
    reading: (item: string, due: string, status: string) => `${item}: ${due} · ${status}`,
  },
};

export type LearningWords = typeof en;
