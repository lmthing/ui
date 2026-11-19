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
  loanLabels: {
    balance: "Remaining balance",
    principal: "Opening principal",
    rate: "Annual rate",
    payment: "Monthly payment",
    next: "Next payment",
    finish: "Estimated payoff",
    schedule: "Upcoming payments",
    edit: "Open terms editor",
    cleared: "Loan paid off",
    forecastError: "No forecast",
    insufficientTitle: "Payment too low",
    insufficient: "The monthly payment must exceed the interest to reduce the balance.",
    unavailable: "No payoff date in this estimate",
    outOfRange: "This balance is too large to estimate.",
    estimate: "Fixed rate. No fees or new debt.",
  },
  loanField: (label: string, value: string) => `${label}: ${value}`,
  loanNext: (label: string, date: string, amount: string) => `${label} · ${date} · ${amount}`,
  loanSplit: (principal: string, interest: string) => `Principal ${principal} · Interest ${interest}`,
  loanRemaining: (balance: string) => `${balance} left`,
  loanRow: (date: string, balance: string, split: string) => `${date} · ${balance} · ${split}`,
  loanMore: (count: string, plural: Intl.LDMLPluralRule) =>
    `And ${count} more ${plural === "one" ? "payment" : "payments"}`,
};

export type MoneyWords = typeof en;
