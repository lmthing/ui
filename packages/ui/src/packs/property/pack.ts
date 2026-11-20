import type { PackMeta } from "../../catalog";

export const pack = {
  id: "property",
  example: "Three Flats tracks occupancy, rent receipts, viewings, room evidence and utility readings.",
  probes: [
    {
      kind: "pack",
      idea: "I manage three rented flats. Track who occupies each unit on a given date and reconcile monthly rent charges against partial receipts.",
      expect: ["property"],
    },
    {
      kind: "pack",
      idea: "Run a portfolio of rented homes with occupancy dates, prospect viewings, move-in condition reports and manual utility meter readings. No booking or maintenance queue.",
      expect: ["property"],
    },
    {
      kind: "pack",
      idea: "A repair help desk for tenants: triage reported faults, assign work orders, track each repair through resolution. No occupancy, rent or property records.",
      expect: ["requests"],
    },
    {
      kind: "choose",
      need: "Show one headline price: 900 per month. No ledger, roster, balance or payment records.",
      expect: "Amount",
    },
  ],
} as const satisfies PackMeta;
