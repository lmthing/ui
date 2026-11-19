import type { ArchetypeMeta } from "../../../catalog";

export const invest = {
  id: "invest",
  job: "A holding",
  defaultLayout: "simple",
  layouts: {
    simple: {
      writeHints: [
        "Always write all four required components: Header, PriceChart, KeyValue, List. Include the supporting holding details and history rows even with an empty cast; use neutral fallback content rather than omitting KeyValue or List.",
        'List uses style: "inset" with short rows; omit body, me and photo.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["PriceChart"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "PriceChart" },
        { id: "k1", c: "KeyValue" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
