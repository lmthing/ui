export const words = {
  priceChart: {
    series: "Price history",
    start: "Start",
    latest: "Latest",
    ranges: "Price range",
    options: { day: "1D", week: "1W", month: "1M", year: "1Y", all: "All" },
    change: (amount: string) => `${amount} this period`,
    compactChange: (amount: string, negative: boolean) => `${negative ? "-" : "+"}${amount}`,
  },
};
