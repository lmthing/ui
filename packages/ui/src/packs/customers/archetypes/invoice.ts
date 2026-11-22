import type { ArchetypeMeta } from "../../../catalog";

const numberHint =
  'Fill Invoice.number for bills and quotes, using "1" as the draft placeholder when no reference is supplied. Use null for number only on an explicitly requested unnumbered estimate.';

export const invoice = {
  id: "invoice",
  job: "Bill or quote a client",
  defaultLayout: "edit",
  layouts: {
    edit: {
      writeHints: [
        numberHint,
        'End with {"id":"b1","c":"Button","label":"Save","kind":null,"surface":null,"media":null,"icon":null,"goto":null,"confirm":null}. Saving is not destructive; the default button is primary. Invoice already has its own send action.',
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
      writeHints: [numberHint],
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
    items: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["SavedItems"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "SavedItems" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
