import type { PackMeta } from "../../catalog";

export const pack = {
  id: "booking",
  name: "Booking",
  purpose: "Offer services and book appointments, classes and free start times.",
  pick: "Booking time with someone: appointments, classes, slots. Not selling goods (commerce).",
  example: "Trot offers walks, sets working hours and lets clients book a service and time.",
  probes: [
    { kind: "pack", idea: "A dog walker offering appointments that clients book", expect: ["booking"] },
    {
      kind: "pack",
      idea: "A studio where people book a class and wait for a full session",
      expect: ["booking"],
    },
    { kind: "pack", idea: "A shop selling goods, not appointments or time", expect: ["commerce"] },
    {
      kind: "pack",
      idea: "A private habit tracker showing completion toward today's own goal. No appointments, classes, bookable services or sales.",
      expect: [],
    },
    {
      kind: "choose",
      need: "One compact capacity bar shows eight out of twelve class places filled. No waiting queue and no comparison across days or categories.",
      expect: "Progress",
    },
  ],
} as const satisfies PackMeta;
