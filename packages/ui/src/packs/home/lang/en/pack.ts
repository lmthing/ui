import type { LDMLPluralRule, repeatOptions } from "../../../../catalog";

type CareRepeat = Exclude<(typeof repeatOptions)[number], "never">;

const repeatUnits = {
  daily: "day",
  weekdays: "weekday",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

export const words = {
  careRepeat: (repeat: CareRepeat | "never", count: string, form: LDMLPluralRule) =>
    repeat === "never"
      ? "Does not repeat"
      : `Every ${form === "one" ? repeatUnits[repeat] : `${count} ${repeatUnits[repeat]}s`}`,
};
