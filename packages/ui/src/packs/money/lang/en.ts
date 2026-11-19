export const en = {
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
    insufficient: "The monthly payment must exceed the interest to reduce the balance.",
    unavailable: "No payoff date in this estimate",
    outOfRange: "This balance is too large to estimate.",
    estimate: "Fixed-rate estimate. No fees or new borrowing.",
  },
  loanField: (label: string, value: string) => `${label}: ${value}`,
  loanNext: (label: string, date: string, amount: string) => `${label} · ${date} · ${amount}`,
  loanSplit: (principal: string, interest: string) => `Principal ${principal} · Interest ${interest}`,
  loanRow: (date: string, balance: string) => `${date} · ${balance} left`,
  loanMore: (count: string, plural: Intl.LDMLPluralRule) =>
    `And ${count} more ${plural === "one" ? "payment" : "payments"}`,
};

export type MoneyWords = typeof en;
