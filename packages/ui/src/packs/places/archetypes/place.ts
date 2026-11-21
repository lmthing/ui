import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const place = {
  id: "place",
  job: "Visit one place",
  defaultLayout: "venue",
  layouts: {
    venue: {
      writeHints: ["Leave the venue card's photo null; the gallery already shows the venue."],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true, variant: "carousel" },
        { allow: ["PlaceCard"], required: true },
        { allow: ["Hours"], required: true },
        { allow: ["Address"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery", style: "carousel" },
        { id: "p1", c: "PlaceCard" },
        { id: "h2", c: "Hours" },
        { id: "a1", c: "Address" },
        { id: "b1", c: "Button" },
      ],
    },
    walk: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Route"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "r1", c: "Route" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "place",
    layout: "venue",
    brief:
      "Make the Juniper Café venue page: a back heading, two photos to swipe one at a time (lib:park_walk and lib:river_walk), a venue summary with category Dog-friendly café, rating 4.5 and link juniper, opening hours 09:00–16:00 every day, no holiday notices, the address 8 Linden Road, Bristol BS8 2BE, and a Show park walk button linked to park_walk. Do not duplicate the photos in the summary.",
  },
  {
    kind: "compose",
    archetype: "place",
    layout: "walk",
    brief:
      "Make the Two parks walk screen with a back heading, a route from Alder Park to Canal Green, then a list of those two parks with a short note each: Off-lead meadow and Lead-only path.",
  },
] satisfies ComposeProbe[];
