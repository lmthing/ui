export const en = {
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
