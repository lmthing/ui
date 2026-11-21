import type { PackMeta } from "../../catalog";

export const pack = {
  id: "media",
  example: "Pew keeps a library of sermons and series, with recordings, chapter marks and saved excerpts.",
  probes: [
    {
      kind: "pack",
      idea: "A podcast library where I save shows, queue episodes, jump to chapters and revisit saved clips.",
      expect: ["media"],
    },
    {
      kind: "pack",
      idea: "A private reading library for browsing saved newsletters, reading full articles and revisiting saved passages.",
      expect: ["media"],
    },
    {
      kind: "pack",
      idea: "A neighbourhood feed where people publish short posts, comment, react and follow each other. No reading library or recordings.",
      expect: ["social"],
    },
    {
      kind: "pack",
      idea: "Play just one audio recording on one screen with pause and a scrubber. No library, chapters or saved moments.",
      expect: [],
    },
    {
      kind: "choose",
      need: "Play one local audio recording right here with a scrubber and skip controls. Nothing needs to follow me to other screens.",
      expect: "Player",
    },
  ],
} as const satisfies PackMeta;
