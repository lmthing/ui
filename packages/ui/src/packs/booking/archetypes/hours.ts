import type { ArchetypeMeta } from "../../../catalog";

export const hours = {
  id: "hours",
  job: "When I take bookings",
  defaultLayout: "simple",
  layouts: {
    simple: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Availability"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Availability" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
