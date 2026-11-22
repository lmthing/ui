export const words = {
  profitLoss: {
    heading: "Profit and loss",
    profit: "Net profit",
    loss: "Net loss",
    income: "Income",
    expense: "Costs",
    addBack: "Disallowed costs",
    taxable: "Taxable profit",
    dates: (from: string, to: string) => `${from} – ${to}`,
    comparison: (from: string, to: string) => `Compared with ${from} – ${to}`,
    change: (value: string) => `${value} vs prior period`,
    field: (label: string, value: string) => `${label}: ${value}`,
    errorTitle: "Statement unavailable",
    errorDetail: "Check the rules and category assignments.",
  },
};
