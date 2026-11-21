import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const period_report = {
  id: "period_report",
  job: "Close an accounting period or prepare a pay run",
  defaultLayout: "books_statement",
  layouts: {
    books_statement: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["ProfitLoss"], required: true },
        { allow: ["Bars"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "p1", c: "ProfitLoss" },
        { id: "b1", c: "Bars", style: "share" },
        { id: "n1", c: "Note" },
        { id: "b2", c: "Button" },
      ],
    },
    books_pay_run: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Payroll"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Payroll" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "period_report",
    layout: "books_statement",
    brief:
      "Title it Period report. Use Nov and Oct as a segmented period switch, then the income and cost statement for 2026-11-01 through 2026-11-30. Show cost shares Travel 100 and Equipment 50, a Cash basis note and an Open ledger button to ledger.",
  },
  {
    kind: "compose",
    archetype: "period_report",
    layout: "books_pay_run",
    brief:
      "Title it November pay. Draft run nov_pay, 2026-11-01 to 2026-11-30, pay date 2026-12-01. Jo Lin (jo) worked 10 hours at 12, no adjustments, rule sample_pay. Add a Review the rule note and a Done button to reports.",
  },
] satisfies ComposeProbe[];
