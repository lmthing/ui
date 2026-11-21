import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const things = {
  id: "things",
  job: "Everything I have",
  defaultLayout: "grid",
  layouts: {
    grid: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Things"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "t1", c: "Things" },
        { id: "b1", c: "Button" },
      ],
    },
    low: {
      writeHints: ['Set Things.filter to "low". Keep the full item records and their min values.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Things"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "t1", c: "Things", filter: "low" },
        { id: "b1", c: "Button" },
      ],
    },
    add: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "photo" },
        { allow: ["Field"], required: true, variant: "text" },
        { allow: ["Field"], required: true, variant: "number" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "photo" },
        { id: "f2", c: "Field", kind: "text" },
        { id: "f3", c: "Field", kind: "number" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "things",
    layout: "grid",
    brief:
      "Heading Boxes, search by name, All and Kitchen filter chips, a photo grid of my owned kettle (qty 1, local:1, Kitchen box 3, opens kettle), then an Add item button.",
  },
  {
    kind: "compose",
    archetype: "things",
    layout: "low",
    brief:
      "Heading Low stock, an All/Low segmented control with Low selected, and the owned-stock grid filtered to low stock. Include one roll of waste bags at a minimum of two, opening bags. Finish with an Add item button.",
  },
  {
    kind: "compose",
    archetype: "things",
    layout: "add",
    brief:
      "Heading Add item, then three separate fields in this order: attach a photo, type an item name, type a numeric quantity. Finish with a Save button.",
  },
] satisfies ComposeProbe[];
