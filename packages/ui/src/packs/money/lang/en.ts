export const en = {
  bills: {
    empty: "No bills yet",
    month: "Monthly estimate",
    year: "Yearly subscription total",
    due: (date: string) => `Due ${date}`,
    overdue: (name: string) => `${name}, overdue`,
    markPaid: (name: string) => `Mark ${name} as paid`,
    repeat: {
      weekly: "Every week",
      monthly: "Every month",
      yearly: "Every year",
    },
  },
};

export type MoneyWords = typeof en;
