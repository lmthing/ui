export const en = {
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
  watchlist: {
    removed: "Removed from watchlist",
    refreshFailed: "Refresh failed. Last saved quotes shown.",
    refresh: "Refresh quotes",
    remove: (name: string) => `Remove ${name} from watchlist`,
    identitySeparator: " · ",
    direction: { at_or_below: "≤", at_or_above: "≥" },
    target: (direction: string, price: string) => `Target ${direction} ${price}`,
    gap: (change: string, met: boolean) => `${change} · ${met ? "Target met" : "Not met"}`,
    unknown: "Unknown",
    reading: (parts: readonly string[]) => parts.join("; "),
  },
};

export type InvestWords = typeof en;
