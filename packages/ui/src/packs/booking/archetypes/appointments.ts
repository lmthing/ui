import type { ArchetypeMeta } from "../../../catalog";

export const appointments = {
  id: "appointments",
  job: "My upcoming and past bookings",
  defaultLayout: "upcoming",
  layouts: {
    upcoming: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Appointment"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "a1", c: "Appointment" },
        { id: "l1", c: "List" },
      ],
    },
    history: {
      writeHints: [
        'Timeline must use style: "history", at most six items. End, tone and goto must be omitted or null in history; they belong only to hours.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Timeline"], required: true, variant: "history" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "t1", c: "Timeline", style: "history" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
