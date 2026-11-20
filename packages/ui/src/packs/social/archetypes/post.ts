import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const post = {
  id: "post",
  job: "Read one post and its replies, or write a post",
  defaultLayout: "thread",
  layouts: {
    thread: {
      writeHints: [
        'Use a Sheet with style "menu" for moderation. Give the back Header an action with goto "sheet" to open it. Composer with style "reply" is last in the body; Sheet is an overlay.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Post"], required: true },
        { allow: ["Comments"], required: true },
        { allow: ["Composer"], required: true, variant: "reply" },
        { allow: ["Sheet"], required: false, variant: "menu" },
      ],
      defaults: [
        {
          id: "h1",
          c: "Header",
          style: "back",
          action: { icon: "flag", label: "More actions", goto: "sheet" },
        },
        { id: "p1", c: "Post" },
        { id: "c1", c: "Comments" },
        { id: "c2", c: "Composer", style: "reply" },
        {
          id: "s1",
          c: "Sheet",
          style: "menu",
          items: [0, 1].map((index) => ({ label: placeholderTitle(index) })),
        },
      ],
    },
    compose: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Field"], required: true, variant: "photo" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "f1", c: "Field", kind: "photo" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "post",
    layout: "thread",
    brief:
      "A back header, Maya’s full fern post, comments with an indented reply, and a reply entry at the end of the body. Include an overlay menu for Report and Block.",
  },
  {
    kind: "compose",
    archetype: "post",
    layout: "compose",
    brief:
      "A New post title, a multiline entry for an update, a photo attachment field and a single Publish button.",
  },
] satisfies ComposeProbe[];
