import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const admin_list = {
  id: "admin_list",
  job: "Browse, filter or batch-edit records of one kind",
  defaultLayout: "table",
  layouts: {
    table: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["FilterBar"], required: true },
        { allow: ["Table"], required: true },
        { allow: ["BulkActions"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "FilterBar" },
        { id: "t1", c: "Table", selectable: true },
        { id: "b1", c: "BulkActions" },
      ],
    },
    cards: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["FilterBar"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "FilterBar" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "admin_list",
    layout: "table",
    brief:
      "Show a Stockroom heading, Find stock search with a Stock dropdown (Low, In stock), a selectable table sorted by the second column with Product (text), Stock (number) and the row Seed tray, 3, and actions for the checked rows: Reorder (shopping cart icon, safe) and Delete (close icon, dangerous).",
  },
  {
    kind: "compose",
    archetype: "admin_list",
    layout: "cards",
    brief:
      "Show the Suppliers heading, Find suppliers search with a Region dropdown (Local, Regional), then a short list of supplier names Green Lane and Cedar Mill, with one note per supplier. No shared columns or batch actions.",
  },
] satisfies ComposeProbe[];
