import type { ArchetypeMeta } from "../../../catalog";

export const invoice = {
  id: "invoice",
  job: "Bill or quote a client",
  defaultLayout: "edit",
  layouts: {
    edit: {
      writeHints: [
        'End with a Button that saves the draft locally: label "Save", kind "primary", icon null, goto null, confirm null. Invoice already has its own send action.',
        "Return compact, complete JSON. Write null for unused optional fields and close every object and array.",
      ],
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
