import type { ArchetypeMeta } from "../../../catalog";

export const debt = {
  id: "debt",
  job: "Understand and clear what I owe",
  defaultLayout: "money_loan",
  layouts: {
    money_loan: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Loan"], required: true, variant: "schedule" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "l1", c: "Loan", style: "schedule" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    money_payoff: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Payoff"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Payoff" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
