import type { ArchetypeMeta } from "../../../catalog";

export const invoice = {
  id: "invoice",
  job: "Bill or quote a client",
  defaultLayout: "edit",
  layouts: {
    edit: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Invoice"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "i1", c: "Invoice" },
        { id: "b1", c: "Button" },
      ],
    },
    status: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["PaymentStatus"], required: true },
        { allow: ["Invoice"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "p1", c: "PaymentStatus" },
        { id: "i1", c: "Invoice" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
