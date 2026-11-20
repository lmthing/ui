import type { PackMeta } from "../../catalog";

export const pack = {
  id: "data",
  example: "Stockroom filters and sorts stock, applies batch reorders, and compares sales and busy hours.",
  probes: [
    {
      kind: "pack",
      idea: "A small operation's internal back office: compare hundreds of generic records in sortable tables, filter by several fields, then tag the checked rows together.",
      expect: ["data"],
    },
    {
      kind: "pack",
      idea: "Run an internal operations dashboard with custom record-stage columns and aggregate reports, including multi-series trends and busy-time heatmaps. No booking, sales, service tickets or staff scheduling.",
      expect: ["data"],
    },
    {
      kind: "pack",
      idea: "Triage incoming maintenance reports in a service queue, assign technicians to work orders, and verify repairs before closing each ticket. No arbitrary records or generic boards.",
      expect: ["requests"],
    },
    {
      kind: "pack",
      idea: "A private personal tally: one counter I can tap to add or subtract one. No records to browse, reports or shared work.",
      expect: [],
    },
    {
      kind: "choose",
      need: "Show three headline numbers: 18 total, 5 due today and 2 late. No table of records or trend over time.",
      expect: "Stats",
    },
  ],
} as const satisfies PackMeta;
