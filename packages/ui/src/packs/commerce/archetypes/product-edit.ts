import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const product_edit = {
  id: "product_edit",
  job: "Add or change a product",
  defaultLayout: "form",
  layouts: {
    form: {
      writeHints: [
        'Include a photo field, one text field for the name, and two number fields for price and stock. Field values are strings or null. Use Composer style "entry" for the description.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "photo" },
        { allow: ["Field"], required: true, variant: "text" },
        { allow: ["Field"], required: true, variant: "number", min: 2, max: 2 },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "photo" },
        { id: "f2", c: "Field", kind: "text" },
        { id: "f3", c: "Field", kind: "number" },
        { id: "f4", c: "Field", kind: "number" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "product_edit",
    layout: "form",
    brief: "Edit a product's photo, name, price, stock and longer description, and save the record.",
  },
] satisfies ComposeProbe[];
