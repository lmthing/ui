import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const tracking = {
  id: "tracking",
  job: "Follow something on its way",
  defaultLayout: "delivery",
  layouts: {
    delivery: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["DeliveryTracker"], required: true },
        { allow: ["KeyValue"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "d1", c: "DeliveryTracker" },
        { id: "k1", c: "KeyValue" },
      ],
    },
    departures: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Departures"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "d1", c: "Departures" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "tracking",
    layout: "delivery",
    brief:
      "Make a delivery screen with a Your delivery heading, a live courier map tracking Nia who is on the way, then two labeled details: Order SN-42 and Drop-off Side gate. Do not invent an ETA or map position.",
  },
  {
    kind: "compose",
    archetype: "tracking",
    layout: "departures",
    brief:
      "Make a Next buses heading, a search field to find a stop, then the departures board for Alder Park with line 8 to Clifton and line 9 to Riverside. The transit feed supplies the countdowns and delays.",
  },
] satisfies ComposeProbe[];
