export const words = {
  transactions: {
    today: "Today",
    yesterday: "Yesterday",
    date: (weekday: string, day: string, month: string) => `${weekday} ${day} ${month}`,
    compactAmount: (amount: string, negative: boolean) => `${negative ? "-" : "+"}${amount}`,
    entry: (payee: string, category: string, amount: string) => `${payee} · ${category} · ${amount}`,
    status: { posted: "Posted", pending: "Pending", disputed: "Disputed" },
    receipt: "Receipt",
    separator: "\u00a0· ",
  },
};
