import type { ArchetypeMeta } from "../../../catalog";

export const book = {
  id: "book",
  job: "Choose a service and a time",
  defaultLayout: "service",
  layouts: {
    service: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ServiceMenu"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "ServiceMenu" },
        { id: "n1", c: "Note" },
      ],
    },
    time: {
      writeHints: [
        'Use Calendar style "week" to choose one date. Omit range, checkIn, checkOut and minNights; this is not a date range. Put the available start times in Slots.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["StaffPicker"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Slots"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "StaffPicker" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "s2", c: "Slots" },
        { id: "b1", c: "Button" },
      ],
    },
    confirm: {
      writeHints: [
        'Field must use kind: "repeat" and repeat: "weekly". Omit or null value and options; those are not repeat fields.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Appointment"], required: true, variant: "summary" },
        { allow: ["Field"], required: true, variant: "repeat" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Appointment", style: "summary" },
        { id: "f1", c: "Field", kind: "repeat" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
