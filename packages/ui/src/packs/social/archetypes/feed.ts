import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const feed = {
  id: "feed",
  job: "See what people shared",
  defaultLayout: "posts",
  layouts: {
    posts: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Stories"], required: true },
        { allow: ["Feed"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Stories" },
        { id: "f1", c: "Feed" },
        { id: "b1", c: "Button" },
      ],
    },
    poll: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Poll"], required: true },
        { allow: ["Feed"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Poll" },
        { id: "f1", c: "Feed" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "feed",
    layout: "posts",
    brief:
      "The Fernpost home screen: title, a row of temporary avatar updates, recent cutting-swap posts and one button to create a post.",
  },
  {
    kind: "compose",
    archetype: "feed",
    layout: "poll",
    brief:
      "Title, a vote between Saturday and Sunday to see which day suits the next cutting swap, then recent plant posts.",
  },
] satisfies ComposeProbe[];
