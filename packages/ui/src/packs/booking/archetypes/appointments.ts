import { type ArchetypeMeta } from "../../../catalog";

export const appointments = {
  id: "appointments",
  job: "My upcoming and past bookings",
  defaultLayout: "upcoming",
  layouts: {
    upcoming: {
      writeHints: [
        "Always include the required List after Appointment, even with an empty cast. Its 1–6 rows summarize past appointments: short service titles, dates or status in meta, and optional goto links. Do not omit this slot; use the valid default List when no past records are supplied.",
        'Use one List without a style or numbered lead. On every row, me is false or null, photo is null and body is null. These are past appointment records, never a personal "me" row, a photo shelf or expandable answers.',
      ],
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
    packs: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["SessionPack"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "s2", c: "SessionPack" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
