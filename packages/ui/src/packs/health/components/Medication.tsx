import { z } from "zod";
import {
  clock,
  placeholderDetail,
  probesFor,
  text,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { seedTitles } from "..";

// Core first: Checklist/plain cannot log timed doses, skipped marks and remaining stock with refill thresholds.
export const meta = {
  id: "Medication",
  status: "draft",
  group: "input",
  purpose: "Log today's medicine doses by time, including taken, skipped and remaining pills.",
  pick: "Medicines or supplements on schedule, with doses, taken/skipped marks and refill stock. Not ordinary jobs (Checklist) or nudging one count (Counter).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Doses stored on the device; reminders need notification permission, and this log is not medical advice.",
  items: { key: "doses", parts: ["root", "name", "dose", "time", "taken", "skip", "left"] },
  parts: ["root", "refill"],
  states: ["filled", "empty", "success"],
  actions: { items: { taken: ["check"], skip: ["press"] } },
} as const satisfies Meta;
export const props = z.strictObject({
  doses: z
    .array(
      z.strictObject({
        name: text(24),
        dose: text(16),
        time: clock,
        status: z.enum(["due", "taken", "skipped"]).default("due"),
        left: z.int().min(0).max(10000).optional(),
      }),
    )
    .min(1)
    .max(8),
  refillAt: z.int().min(0).max(10000).optional(),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    doses: seedTitles(cast, 2, 24).map((name) => ({
      name,
      dose: placeholderDetail,
      time: "00:00",
      status: "due",
    })),
  };
}
export const examples = [
  {
    doses: [
      { name: "Vitamin D", dose: "1 tablet", time: "08:00", status: "due", left: 4 },
      { name: "Magnesium", dose: "1 capsule", time: "20:00", status: "taken", left: 20 },
    ],
    refillAt: 5,
  },
  { doses: [{ name: "Iron supplement", dose: "1 tablet", time: "09:30", status: "skipped" }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Medication");
export const probes = [
  choose("Show today's medicine doses by time, mark taken or skipped, and warn when pill stock is low"),
  choose("Tick off today's jobs, stretch and walk, with no dose times, medicine or stock", "Checklist"),
  write(
    "Vitamin D one tablet at 08:00 due, four pills left, and magnesium one capsule at 20:00 taken, twenty left, refill threshold five",
  ),
  read("Mark the morning vitamin D dose taken", { address: "m1/r1/taken", action: "check" }),
  read("Skip the morning vitamin D dose", { address: "m1/r1/skip", action: "press" }),
] satisfies Probe[];
