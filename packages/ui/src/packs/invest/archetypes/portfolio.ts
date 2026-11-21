import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const portfolio = {
  id: "portfolio",
  job: "My investments over time",
  defaultLayout: "invest_positions",
  layouts: {
    invest_positions: {
      writeHints: ['For the large portfolio value, use Amount emphasis "hero", not style "large".'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Holdings"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Amount", emphasis: "hero" },
        { id: "h2", c: "Holdings" },
        { id: "b1", c: "Button" },
      ],
    },
    invest_allocation: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Bars"], required: true, variant: "share" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "b1", c: "Bars", style: "share" },
        { id: "n1", c: "Note" },
      ],
    },
    invest_performance: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Performance"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Performance" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "portfolio",
    layout: "invest_positions",
    brief:
      "Header: Education portfolio. Show the account's already calculated total value of 1100 as one large focal monetary figure. For portfolio education, opened on 2026-01-01T00:00:00Z, show 10 Global Equity Fund units (global_fund, GEF, fund) at opening unit cost 80, quoted at 90 on 2026-03-01T16:00:00Z. End with an Add a trade button linking to record_trade.",
  },
  {
    kind: "compose",
    archetype: "portfolio",
    layout: "invest_allocation",
    brief:
      "Header: Allocation. Add a breakdown titled Allocation showing shares of one whole, using the supplied values Fund 900 and Cash 200. End with a note, Cash is included in the portfolio.",
  },
  {
    kind: "compose",
    archetype: "portfolio",
    layout: "invest_performance",
    brief:
      "Header: Growth. Show an all-history comparison titled Value and contributions for portfolio education. At 2026-01-01T00:00:00Z there were no quotes; at 2026-03-01T16:00:00Z global_fund was quoted at 90. Store dates and quotes, not invented portfolio totals. End with the note Deposits are not investment gains.",
  },
] satisfies ComposeProbe[];
