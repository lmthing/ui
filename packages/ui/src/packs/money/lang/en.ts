export const en = {
  transactions: {
    today: "Today",
    yesterday: "Yesterday",
    date: (weekday: string, day: string, month: string) => `${weekday} ${day} ${month}`,
    entry: (payee: string, category: string, amount: string) => `${payee} · ${category} · ${amount}`,
  },
};

export type MoneyWords = typeof en;
