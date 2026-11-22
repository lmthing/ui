import { z } from "zod";
import type { Definition, ScreenLike } from "@lmthing/ui/catalog";

export const interval = 5000;
export const sequence: Definition = {
  meta: {
    id: "StoryFixture",
    group: "input",
    purpose: "Exercise discrete playback.",
    pick: "Test only.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Test only.",
    sequence: {
      cursor: "current",
      count: 3,
      steps: { next: "next" },
      controls: { part: "story", intervalMs: interval, start: true },
    },
    actions: { parts: { next: ["press"], story: ["play", "pause", "stop"] } },
  },
  props: z.strictObject({ current: z.int().optional() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
export const defs = { StoryFixture: sequence };
export const screen: ScreenLike = { id: "home", components: [{ id: "story", c: "StoryFixture" }] };
export const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
