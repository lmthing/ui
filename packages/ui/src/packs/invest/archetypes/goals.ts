import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const goals = {
  id: "goals",
  job: "Long-term savings targets",
  defaultLayout: "invest_goal",
  layouts: {
    invest_goal: {
      writeHints: [
        "The Progress ring is the focus and is the only component that may use hero emphasis. Set emphasis to null on Amount, Header and Note; the Amount below the ring is a supporting number.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Progress"], required: true, variant: "ring" },
        { allow: ["Amount"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "Progress", style: "ring" },
        { id: "a1", c: "Amount" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    invest_goals: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Progress" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    invest_contribution: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "number" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "number" },
        { id: "f2", c: "Field", kind: "date" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "goals",
    layout: "invest_goal",
    brief:
      "Header: Education goal. A single circular goal shows 1108 out of 5000, labelled Education. Below it show the current value 1108 as a monetary figure. Add the note Funded from the portfolio's current value and a Record contribution button linking to contribution.",
  },
  {
    kind: "compose",
    archetype: "goals",
    layout: "invest_goals",
    brief:
      "Header: Savings goals. Show two progress bars with their own targets: Education 1108 of 5000 and Travel 600 of 900. Exceeding a savings target is good. Finish with the note Each goal is funded separately and an Add goal button linking to add_goal.",
  },
  {
    kind: "compose",
    archetype: "goals",
    layout: "invest_contribution",
    brief:
      "Header: Record contribution. Show two separate form fields in this order: a numeric field labelled Amount and a date field labelled Date. Leave both empty. End with a Save contribution button.",
  },
] satisfies ComposeProbe[];
