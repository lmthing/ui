export const words = {
  accountKinds: {
    current: "Current",
    savings: "Savings",
    card: "Card",
    cash: "Cash",
    jar: "Jar",
  },
  accountCreditLimit: "Credit limit:",
  accountRewardsValue: "Rewards:",
  accountDetail: (label: string, amount: string) => `${label} ${amount}`,
  accountLabel: (name: string, kind: string, balance: string, last4?: string) =>
    `${name}, ${kind}${last4 ? ` ending in ${last4}` : ""}, ${balance}`,
};
