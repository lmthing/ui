export const words = {
  watchlist: {
    removed: "Removed from watchlist",
    refreshFailed: "Refresh failed. Last saved quotes shown.",
    refresh: "Refresh quotes",
    remove: (name: string) => `Remove ${name} from watchlist`,
    identitySeparator: " · ",
    direction: { at_or_below: "≤", at_or_above: "≥" },
    targetLead: (direction: string) => `Target ${direction} `,
    gapTail: (side: "above" | "below" | "equal" | "unknown", met: boolean) =>
      `${{ above: " above target", below: " below target", equal: " from target", unknown: "" }[side]} · ${met ? "Met" : "Not met"}`,
    unknown: "Unknown",
    reading: (parts: readonly string[]) => parts.join("; "),
  },
};
