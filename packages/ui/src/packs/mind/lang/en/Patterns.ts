export const words = {
  patterns: {
    title: "Mood patterns",
    withFactor: "With factor",
    withoutFactor: "Without factor",
    daysLeft: (count: string, plural: Intl.LDMLPluralRule) =>
      `Log ${count} more ${plural === "one" ? "day" : "days"}.`,
    noComparison: "Not enough days with and without the same factor yet.",
    finding: {
      higher: (factor: string) => `Higher mood with ${factor}`,
      lower: (factor: string) => `Lower mood with ${factor}`,
      same: (factor: string) => `Similar mood with ${factor}`,
    },
    reading: (label: string, value: string) => `${label}: ${value}`,
  },
};
