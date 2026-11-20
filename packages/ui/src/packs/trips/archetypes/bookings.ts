import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

const options = [{ label: "Bookings" }, { label: "Documents" }];

export const bookings = {
  id: "bookings",
  job: "Confirmations and documents",
  defaultLayout: "list",
  layouts: {
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented", options, at: 0 },
        { id: "l1", c: "List" },
      ],
    },
    docs: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["TravelDocs"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented", options, at: 1 },
        { id: "t1", c: "TravelDocs" },
      ],
    },
    pass: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Reservation"], required: true, variant: "pass" },
        { allow: ["KeyValue"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "r1", c: "Reservation", style: "pass", code: true },
        { id: "k1", c: "KeyValue" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "bookings",
    layout: "list",
    brief:
      "Show a two-option switch for Bookings and Documents with Bookings selected, then a list linking to the train and hotel confirmations.",
  },
  {
    kind: "compose",
    archetype: "bookings",
    layout: "docs",
    brief:
      "Show a two-option switch for Bookings and Documents with Documents selected, then passports with expiry dates and no supplied document numbers.",
  },
  {
    kind: "compose",
    archetype: "bookings",
    layout: "pass",
    brief:
      "Back header, full-width Shinkansen pass with scannable code, and plain key/value facts about the boarding gate.",
  },
] satisfies ComposeProbe[];
