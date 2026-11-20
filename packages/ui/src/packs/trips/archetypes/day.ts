import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const day = {
  id: "day",
  job: "One day of the trip",
  defaultLayout: "today",
  layouts: {
    today: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Timeline"], required: true, variant: "day" },
        { allow: ["MapPins"], required: true },
        { allow: ["Reservation"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "t1", c: "Timeline", style: "day" },
        { id: "m1", c: "MapPins" },
        { id: "r1", c: "Reservation" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "day",
    layout: "today",
    brief:
      "One Kyoto day with a back header, the morning's timed visits, map pins for both stops and the Kyoto Garden Inn confirmation at the bottom.",
  },
] satisfies ComposeProbe[];
