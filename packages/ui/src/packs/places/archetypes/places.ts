import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const places = {
  id: "places",
  job: "Find places near me",
  defaultLayout: "map",
  layouts: {
    map: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["MapList"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "m1", c: "MapList" },
      ],
    },
    list: {
      writeHints: [
        "Put venue facts in List row meta and each venue’s own link in goto. For ordinary results leave row mark and tone null; the amenity chips are filters, not highlights on the rows.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "places",
    layout: "map",
    brief:
      "Build Sniff’s nearby screen with a heading, a place search field, Water bowl and Off lead filter chips, then a map with synced rows and a list-only toggle. Include Juniper Café (water bowl, opens juniper) and Alder Park (off lead, opens alder).",
  },
  {
    kind: "compose",
    archetype: "places",
    layout: "list",
    brief:
      "Build a Places nearby heading, a place search field, Water bowl and Off lead filter chips, then a plain list of Juniper Café (water bowl, opens juniper) and Alder Park (off lead, opens alder). No map.",
  },
] satisfies ComposeProbe[];
