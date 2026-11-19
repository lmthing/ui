import { z } from "zod";
import { isoDate, probesFor, type CastLike, type Meta, type Probe } from "../../../catalog";
import { cycleLabels } from "..";

// Core first: Calendar/month cannot derive cycle phases, next period and a fertile window from period dates.
export const meta = {
  id: "Cycle",
  status: "draft",
  group: "data",
  purpose: "Follow logged menstrual periods and locally estimated cycle phases.",
  pick: "A menstrual cycle with period days, today's phase and estimated next period and fertile window. Not progress toward a goal (Ring), or dates merely marked with activity (Calendar).",
  writeHints: [
    "Write only start, average length and period duration. Predictions are computed locally and are not a method of contraception.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Period dates stored only on the device, never shared; local predictions are not medical advice or a method of contraception.",
  parts: ["root", "day", "phase", "next", "window", "disclaimer", "log"],
  states: ["filled", "empty"],
  actions: { parts: { log: ["press"] } },
  read: (_input, state) => (state === "filled" ? [cycleLabels.log, cycleLabels.disclaimer] : []),
} as const satisfies Meta;
export const props = z.strictObject({
  start: isoDate,
  length: z.int().min(21).max(40),
  period: z.int().min(2).max(10),
});
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { start: new Date().toISOString().slice(0, 10), length: 28, period: 5 };
}
export const examples = [
  { start: "2026-11-01", length: 28, period: 5 },
  { start: "2026-10-26", length: 32, period: 6 },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Cycle");
export const probes = [
  choose(
    "Follow my menstrual cycle, showing today's cycle day, phase, predicted next period and fertile window",
  ),
  choose("Show a month of dates with dots on my planned walks, without cycle predictions", "Calendar"),
  write("Last period began 1 November 2026, average cycle 28 days and period lasts five days"),
  read("Log a new period", { address: "c1/log", action: "press" }),
] satisfies Probe[];
