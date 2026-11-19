import type { ArchetypeMeta } from "../../../catalog";

export const wallet = {
  id: "wallet",
  job: "My money now",
  defaultLayout: "accounts",
  layouts: {
    accounts: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Amount"], required: true, variant: "large" },
        { allow: ["AccountCard"], required: true },
        { allow: ["Transactions"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Amount", style: "large" },
        { id: "a2", c: "AccountCard" },
        { id: "t1", c: "Transactions" },
      ],
    },
    goal: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Ring"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Transactions"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "Ring" },
        { id: "a1", c: "Amount" },
        { id: "t1", c: "Transactions" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
