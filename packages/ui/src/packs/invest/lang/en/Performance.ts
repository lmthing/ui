export const words = {
  performance: {
    ranges: { all: "All time", month: "1 month", year: "1 year" },
    range: "Date range",
    observations: "Valuation dates",
    value: "Portfolio value",
    contributed: "Net contributions",
    gain: "Gain / loss",
    latest: "Latest valuation",
    selected: "Selected valuation",
    unknown: "Unknown",
    unavailable: "Connect a portfolio statement to see valuations.",
    error: "The portfolio history could not be reconciled.",
    reading: (at: string, value: string, contributed: string, gain: string) =>
      `${at}: Portfolio value ${value}; Net contributions ${contributed}; Gain / loss ${gain}.`,
  },
};
