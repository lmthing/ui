import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const collection = {
  id: "collection",
  job: "Explore a show, album or book and pick a recording",
  defaultLayout: "episodes",
  layouts: {
    episodes: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Collection"], required: true },
        { allow: ["Playlist"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "Collection" },
        { id: "p1", c: "Playlist", style: "episodes" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "collection",
    layout: "episodes",
    brief:
      "A show page with a top title and a back button, then the overview for Ordinary Time by Rev. Ada Reed (lib:ordinary, not followed, offer Play all and Follow). Below it show the ordered episodes A Quiet Morning (24 minutes, 25% played, opens quiet_morning) and Work of Patience (18 minutes, unplayed, opens patience) with their durations and download controls.",
  },
] satisfies ComposeProbe[];
