import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Timer/down counts time but cannot pace repeating inhale, hold, exhale and rest phases.
export const meta = {
  id: "Breathe",
  status: "draft",
  group: "action",
  purpose: "Follow paced breaths with repeats, phase cues and start or pause.",
  pick: "A growing and shrinking circle guiding inhale, hold, exhale and rest over several rounds. Not counting down an activity (Timer) or playing a recording (Player).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Breathing is paced by an on-device animation with optional gentle haptics.",
  variants: { surface: ["card", "plain"], emphasis: ["normal", "quiet"] },
  parts: ["root", "circle", "phase", "rounds"],
  states: ["filled", "success"],
  actions: { parts: { circle: ["play", "pause"] } },
  writeHints: [
    'For "custom", write all four whole seconds: inhale, hold, exhale and rest (each 0–10, at least one positive). A skipped phase is the number 0, never null. Example: {"pattern":"custom","rounds":5,"inhale":4,"hold":0,"exhale":6,"rest":0}.',
    'Presets are "box" (4-4-4-4), "calm" (4-7-8) and "even" (5-5). Set all four duration fields to null for preset patterns only.',
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { pattern, rounds } = input as z.output<typeof props>;
    return [pattern, c.numberLine(rounds, lang)];
  },
} as const satisfies c.Meta;

const seconds = z.int().min(0).max(10).optional();
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    pattern: z.enum(["box", "calm", "even", "custom"]).default("box"),
    rounds: z.int().min(1).max(20),
    inhale: seconds,
    hold: seconds,
    exhale: seconds,
    rest: seconds,
  })
  .refine(
    ({ pattern, inhale, hold, exhale, rest }) => {
      const phases = [inhale, hold, exhale, rest];
      return pattern === "custom"
        ? phases.every((phase) => phase !== undefined) && phases.some((phase) => (phase ?? 0) > 0)
        : phases.every((phase) => phase === undefined);
    },
    {
      path: ["pattern"],
      message: "Custom needs all four phase durations and at least one positive duration; presets take none",
    },
  );

export function fallback(): z.input<typeof props> {
  return { pattern: "box", rounds: 1 };
}

export const examples = [
  { pattern: "box", rounds: 4 },
  {
    surface: "plain",
    emphasis: "quiet",
    pattern: "custom",
    rounds: 6,
    inhale: 4,
    hold: 2,
    exhale: 6,
    rest: 0,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Breathe");
export const probes = [
  choose(
    "Show a circle that expands as I breathe in and shrinks as I breathe out, pacing six rounds with a hold and pause.",
  ),
  choose(
    "Count down five minutes for a silent sit with start and stop; no breathing rhythm, just time left.",
    "Timer",
  ),
  write("Lead six rounds of custom breathing: inhale four seconds, hold two, exhale six, rest zero."),
  read("Start the breathing exercise.", { address: "b1/circle", action: "play" }),
] satisfies c.Probe[];
