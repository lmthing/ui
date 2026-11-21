import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const thing = {
  id: "thing",
  job: "One thing I own",
  defaultLayout: "detail",
  layouts: {
    detail: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Warranties"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery" },
        { id: "k1", c: "KeyValue" },
        { id: "a1", c: "Amount" },
        { id: "w1", c: "Warranties" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "thing",
    layout: "detail",
    brief:
      "Back heading for Kettle, a photo gallery with local:1 and local:2, two key/value facts (Finish: Steel and Box: Kitchen box 3), a standalone amount of 45, and a proof-of-purchase record for the kettle, bought 2025-12-10 with warranty to 2027-12-10 and receipt local:3.",
  },
] satisfies ComposeProbe[];
