import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const holding = {
  id: "holding",
  job: "One position and its income",
  defaultLayout: "invest_holding",
  layouts: {
    invest_holding: {
      writeHints: ['Set Holdings detail to "brief" and use assetId to filter to the one named position.'],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Holdings"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "h2", c: "Holdings", detail: "brief", assetId: "item_1" },
        { id: "k1", c: "KeyValue" },
        { id: "b1", c: "Button" },
      ],
    },
    invest_income: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Dividends"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "d1", c: "Dividends" },
        { id: "n1", c: "Note" },
      ],
    },
    invest_activity: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["InvestmentActivity"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "i1", c: "InvestmentActivity" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "holding",
    layout: "invest_holding",
    brief:
      "Back header: Global Equity Fund. Show just units and value for the one position, filter to item_1. Portfolio education opened at 2026-01-01T00:00:00Z with 10 units of Global Equity Fund (item_1, GEF, fund) at cost 80, quoted at 90 on 2026-03-01T16:00:00Z. Include one label/value fact, Asset class: Fund. Finish with View income linking to income.",
  },
  {
    kind: "compose",
    archetype: "holding",
    layout: "invest_income",
    brief:
      "Back header: Fund income. Record an unpaid dividend for portfolio education and asset global_fund, id mar_distribution, entitled at 2026-03-01T00:00:00Z, due 2026-03-10, with 1 per unit and 2 withheld. End with the note Record receipt only when the cash arrives.",
  },
  {
    kind: "compose",
    archetype: "holding",
    layout: "invest_activity",
    brief:
      "Back header: Fund activity. Show the education portfolio ledger opened at 2026-01-01T00:00:00Z with zero opening cash and zero contributed. Record first_deposit, 1000 at 2026-01-02T09:00:00Z, then first_buy, 10 global_fund units at 80 on 2026-01-02T10:00:00Z. End with a Record a trade button linking to record_trade.",
  },
] satisfies ComposeProbe[];
