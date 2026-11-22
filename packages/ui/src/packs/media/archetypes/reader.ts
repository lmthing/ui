import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const reader = {
  id: "reader",
  job: "Read, play or revisit a saved passage",
  defaultLayout: "article",
  layouts: {
    article: {
      writeHints: [
        'The related horizontal shelf uses List with style "shelf" and at least two photo rows. Leave each row mark null unless the brief expressly asks to highlight a specific row; related readings are not highlights.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Article"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["List"], required: true, variant: "shelf" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "a1", c: "Article" },
        { id: "t1", c: "SectionTitle" },
        { id: "l1", c: "List", style: "shelf" },
      ],
    },
    listen: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Player"], required: true },
        { allow: ["ChapterList"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "p1", c: "Player" },
        { id: "c1", c: "ChapterList" },
      ],
    },
    transcript: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Player"], required: true },
        { allow: ["Transcript"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "p1", c: "Player" },
        { id: "t1", c: "Transcript", style: "spoken" },
      ],
    },
    highlights: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Highlights"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "h2", c: "Highlights" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "reader",
    layout: "transcript",
    brief:
      'Use a back heading and play A Quiet Morning (lib:quiet_morning, 1440 seconds). Below the scrubber put the actual spoken lines from Ada, synced to the audio: at 0 seconds "Take a moment to settle in." and at 5 seconds "Let the silence have its turn." Let me tap a line to jump to it.',
  },
  {
    kind: "compose",
    archetype: "reader",
    layout: "article",
    brief:
      "Use a top heading with a back button. Below it publish a long reading called In the Stillness by Ada Reed with a heading and several paragraphs about listening. Then add a Related readings section heading and a sideways shelf of exactly two reading covers: Listen Slowly (lib:listen) and A Patient Heart (lib:patience).",
  },
  {
    kind: "compose",
    archetype: "reader",
    layout: "listen",
    brief:
      "Use a heading with a back button, then playback controls and scrubber for A Quiet Morning (lib:quiet_morning, 1440 seconds). Under the controls put three named chapter marks in this same recording: Welcome at 0 seconds, The reading at 76 seconds, and Reflection at 310 seconds.",
  },
  {
    kind: "compose",
    archetype: "reader",
    layout: "highlights",
    brief:
      "Title the screen Saved lines, give me a text search box, and show the passage Let the silence have its turn saved from A Quiet Morning at 05:10, with my note Read this again next week. Open quiet_morning at the saved moment.",
  },
] satisfies ComposeProbe[];
