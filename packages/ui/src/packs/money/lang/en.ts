export const en = {
  split: {
    add: "Add expense",
    balances: "Balances",
    expenses: "Expenses",
    empty: "No expenses yet",
    settled: "All settled",
    settleUp: "Settle up",
    record: "Record",
    recordFor: (from: string) => `Record settlement for ${from}`,
    pays: (from: string, to: string) => `${from} pays ${to}`,
    paidBy: (name: string) => `Paid by ${name}`,
    getsBack: "Gets back",
    owes: "Owes",
    even: "Settled",
    balance: (value: string, sign: bigint) => (sign > 0n ? `+${value}` : value),
    balanceLine: (name: string, value: string) => `${name}: ${value}`,
    paymentLine: (route: string, amount: string) => `${route} ${amount}`,
    expenseLine: (title: string, paidBy: string, amount: string) => `${title} · ${paidBy} · ${amount}`,
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
