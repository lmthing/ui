import type { ArchetypeMeta } from "../../../catalog";

export const schedule = {
  id: "schedule",
  job: "The provider's day",
  defaultLayout: "day",
  layouts: {
    day: {
      writeHints: [
        'Timeline must use style: "hours", each item with time and a later end in HH:MM. Omit or null meta; done must be false or omitted/null. They are not completed-history rows.',
      ],
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
      writeHints: ['The capacity bars use Progress with density "compact"; leave figures null.'],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["KeyValue"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["People"], required: true, variant: "stack" },
        { allow: ["Waitlist"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "k1", c: "KeyValue" },
        { id: "p1", c: "Progress", density: "compact" },
        { id: "p2", c: "People", style: "stack" },
        { id: "w1", c: "Waitlist" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
