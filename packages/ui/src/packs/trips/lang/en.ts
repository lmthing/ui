export const en = {
  converter: {
    home: "Home amount",
    local: "Local amount",
    swap: "Swap currencies",
    amount: (label: string, value: string) => `${label}: ${value}`,
    rateDate: (date: string) => `Rate as of ${date}`,
    noRate: "Exchange rate unavailable",
  },
};

export type TripsWords = typeof en;
