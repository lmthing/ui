export const words = {
  matchStats: {
    title: "Match stats",
    period: "Match period",
    empty: "Match stats are unavailable.",
    selectedPeriod: (period: string) => `Selected period: ${period}`,
    comparison: (metric: string, home: string, homeValue: string, away: string, awayValue: string) =>
      `${metric}: ${home} ${homeValue}, ${away} ${awayValue}`,
  },
};
