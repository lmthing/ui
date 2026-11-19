export const en = {
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
  transactions: {
    today: "Today",
    yesterday: "Yesterday",
    date: (weekday: string, day: string, month: string) => `${weekday} ${day} ${month}`,
    entry: (payee: string, category: string, amount: string) => `${payee} · ${category} · ${amount}`,
  },
};

export type MoneyWords = typeof en;
