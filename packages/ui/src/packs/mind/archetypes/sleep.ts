import type { ArchetypeMeta } from "../../../catalog";

export const sleep = {
  id: "sleep",
  job: "Log a night's bedtime, wake time and sleep quality",
  defaultLayout: "log",
  layouts: {
    log: {
      writeHints: [
        'Use two Fields of kind "time" in order: Bedtime, then Wake time. Leave values null unless actual times are supplied.',
        "For both time Fields, set repeat and options to literal null. They are individual times, not recurring schedules or menus.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Scale"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "time" },
        { id: "f2", c: "Field", kind: "time" },
        { id: "s1", c: "Scale" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
