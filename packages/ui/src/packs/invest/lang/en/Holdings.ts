export const words = {
  holdings: {
    refresh: "Refresh quotes",
    refreshFailed: "Couldn't refresh quotes. Showing saved data.",
    ledgerUnavailable: "Holdings are unavailable.",
    unknown: "Unknown",
    noQuote: "No saved quote",
    units: (amount: string, single: boolean) => `${amount} ${single ? "unit" : "units"}`,
    unitCost: (amount: string) => `Unit cost ${amount}`,
    price: (amount: string) => `Quote ${amount}`,
    valueLabel: "Value",
    valueGap: " ",
    gain: (amount: string) => `Gain ${amount}`,
    positive: (amount: string) => `+${amount}`,
  },
};
