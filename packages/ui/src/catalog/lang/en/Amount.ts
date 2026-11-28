export const words = {
  perWords: {
    hour: "hr",
    day: "day",
    night: "night",
    week: "week",
    month: "month",
    year: "year",
    each: "each",
    person: "person",
  },
  perAmount: (amount: string, per: string) => `${amount} / ${per}`,
};

export const amountChangeLabel = {
  up: (amount: string) => `Up ${amount}`,
  down: (amount: string) => `Down ${amount}`,
  flat: "No change",
};

export const amountRateLabel = (unit: string) => (unit === "each" ? "Each" : `Per ${unit}`);
