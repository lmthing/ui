import type { LDMLPluralRule, repeatOptions } from "../../../../catalog";

export const words = {
  choreLabels: {
    once: "No repeat",
    ready: "Ready to do",
    today: "Due today",
    done: "Done for now",
    complete: "Chores complete",
  },
  chorePoints: (count: string, form: LDMLPluralRule) => ({
    count,
    suffix: form === "one" ? " point" : " points",
  }),
  choreCheck: (title: string) => `Mark ${title} done`,
};
