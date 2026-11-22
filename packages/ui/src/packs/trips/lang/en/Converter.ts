export const words = {
  converter: {
    home: "Home amount",
    local: "Local amount",
    swap: "Swap currencies",
    amountHint: "Enter amount",
    currencyLabel: (currency: string, side: string) => `${currency} · ${side}`,
    amount: (label: string, value: string) => `${label}: ${value}`,
    rateDate: (date: string) => `Rate as of ${date}`,
    noRate: "Exchange rate unavailable",
  },
};
