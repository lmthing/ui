import type { PackMeta } from "../../catalog";

export const pack = {
  id: "invest",
  example:
    "Nest follows an education portfolio from its first deposit through trades, dividends and savings goals.",
  probes: [
    {
      kind: "pack",
      idea: "Track a retirement portfolio: record fund units and their purchase cost, compare the portfolio value with lifetime contributions, and record dividends when received.",
      expect: ["invest"],
    },
    {
      kind: "pack",
      idea: "Follow stocks and funds I might buy someday. Keep historical quotes beside my own price thresholds and show the gap to each target. No orders.",
      expect: ["invest"],
    },
    {
      kind: "pack",
      idea: "Keep my household checking account balance, grocery spending budget and bills due this month. I don't track investments.",
      expect: ["money"],
    },
    {
      kind: "choose",
      need: "Make one big monetary figure showing only my current account balance. No positions, trades, goals or history.",
      expect: "Amount",
    },
  ],
} as const satisfies PackMeta;
