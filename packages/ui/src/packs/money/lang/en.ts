export const en = {
  bills: {
    month: "Monthly estimate",
    year: "Yearly total",
    separator: "\u00a0· ",
    due: (date: string) => `Due ${date}`,
    overdue: (name: string) => `${name}, overdue`,
    markPaid: (name: string) => `Mark ${name} as paid`,
    repeat: {
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    },
  },
  accountKinds: {
    current: "Current",
    savings: "Savings",
    card: "Card",
    cash: "Cash",
    jar: "Jar",
  },
  accountSuffix: (last4: string) => ` · ${last4}`,
  accountLabel: (name: string, kind: string, balance: string, last4?: string) =>
    `${name}, ${kind}${last4 ? ` ending in ${last4}` : ""}, ${balance}`,
};

export type MoneyWords = typeof en;
