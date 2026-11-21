import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const watchlist = {
  id: "watchlist",
  job: "Quotes against watch thresholds",
  defaultLayout: "invest_watch",
  layouts: {
    invest_watch: {
      writeHints: ['Use Watchlist detail "full" to show the thresholds and gaps.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Watchlist"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "w1", c: "Watchlist", detail: "full" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "watchlist",
    layout: "invest_watch",
    brief:
      "Header: My watched funds. Put a search box with hint Find a fund above the results. Watch Income Fund (income_fund, IFD) quoted at 55 on 2026-03-01T16:00:00Z. My target is 50 or lower; visibly show the signed gap and target beside the quote without writing the computed gap. End with an Add to watch button linking to add_watch.",
  },
] satisfies ComposeProbe[];
