import type { ArchetypeMeta } from "../../../catalog";

export const schedule = {
  id: "schedule",
  job: "The provider's day",
  defaultLayout: "day",
  layouts: {
    day: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Timeline"], required: true, variant: "hours" },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "t1", c: "Timeline", style: "hours" },
        { id: "s1", c: "Stats" },
      ],
    },
    class: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["KeyValue"], required: true },
        { allow: ["Progress"], required: true, variant: "compact" },
        { allow: ["People"], required: true, variant: "stack" },
        { allow: ["Waitlist"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "k1", c: "KeyValue" },
        { id: "p1", c: "Progress", style: "compact" },
        { id: "p2", c: "People", style: "stack" },
        { id: "w1", c: "Waitlist" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
