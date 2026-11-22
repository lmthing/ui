export const words = {
  cycleDay: (day: string) => `Day ${day}`,
  cycleNotStarted: "Not started",
  cycleNext: (date: string) => `Next period · ${date} (est.)`,
  cycleWindow: (dates: string) => `Fertile window (est.) · ${dates}`,
  cycleLabels: {
    log: "Log period",
    disclaimer: "Predictions are not a method\u00a0of\u00a0contraception.",
    empty: "Log a period to see cycle\u00a0estimates.",
    upcoming: "Upcoming period",
    period: "Period",
    follicular: "Follicular phase",
    ovulation: "Ovulation estimate",
    luteal: "Luteal phase",
  },
};
