export const words = {
  matchGoal: "Goal",
  matchFeed: {
    title: "Match events",
    add: "Add event",
    sides: { home: "Home", away: "Away" },
    kinds: { goal: "Goal", card_yellow: "Yellow card", card_red: "Red card", sub: "Sub", note: "Note" },
    minute: (value: string) => `${value}′`,
    event: (minute: string, side: string, kind: string, text: string) =>
      `${minute} ${side} · ${kind}: ${text}`,
  },
};
