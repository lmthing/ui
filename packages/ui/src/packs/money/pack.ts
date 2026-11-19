import type { PackMeta } from "../../catalog";

export const pack = {
  id: "money",
  example:
    "Kitty logs a flat's expenses, bills and budget and compares a friend's loan with a credit-card payoff.",
  probes: [
    {
      kind: "pack",
      idea: "My personal monthly budget, bank balances, spending entries and upcoming household bills",
      expect: ["money"],
    },
    {
      kind: "pack",
      idea: "A flat's shared expense pot showing who owes whom, plus my credit-card debt repayment plan",
      expect: ["money"],
    },
    {
      kind: "pack",
      idea: "A shop selling cakes with product prices, a shopping basket and checkout, not personal balances or household bills",
      expect: ["commerce"],
    },
    {
      kind: "choose",
      need: "Show only the single total amount of my savings as one big figure. No separate accounts, entries or repayment plan.",
      expect: "Amount",
    },
  ],
} as const satisfies PackMeta;
