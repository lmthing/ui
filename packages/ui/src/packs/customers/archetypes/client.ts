import type { ArchetypeMeta } from "../../../catalog";

const portraitHint =
  'ClientCard needs a photo reference even when no client photo is supplied: use photo "local:1" as the neutral placeholder. Leave media null unless the portrait is explicitly hidden.';

export const client = {
  id: "client",
  job: "One client fully",
  defaultLayout: "overview",
  layouts: {
    overview: {
      writeHints: [portraitHint],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["ClientCard"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Loyalty"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "ClientCard" },
        { id: "k1", c: "KeyValue" },
        { id: "l1", c: "List" },
        { id: "l2", c: "Loyalty" },
      ],
    },
    history: {
      writeHints: [portraitHint],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["ClientCard"], required: true },
        { allow: ["ClientHistory"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "ClientCard" },
        { id: "c2", c: "ClientHistory" },
      ],
    },
    waiver: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Agreement"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "a1", c: "Agreement" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
