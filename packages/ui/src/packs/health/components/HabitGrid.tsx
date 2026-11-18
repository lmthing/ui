import { z } from "zod";
import { icon, probesFor, text, type CastLike, type Meta, type Probe } from "../../../catalog";
import { indexedActions, indexedParts, seedTitles } from "..";

// Core first: Streak/default cannot tick several habits independently across seven weekday columns.
export const meta = {
  id: "HabitGrid",
  status: "draft",
  group: "input",
  purpose: "Keep several healthy habits across the seven days of this week.",
  pick: "Several habits by seven weekdays, an editable check per cell and streak per habit. Not one habit's run of days (Streak), today's jobs only (Checklist), or many weeks of activity (Heatmap).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Habit records stored on the device.",
  items: { key: "habits", parts: ["root", "name", "icon", "streak", ...indexedParts(7, ["day"])] },
  parts: ["root"],
  states: ["filled", "empty"],
  actions: {
    items: indexedActions(7, { day: ["check"] }),
    when: Object.fromEntries(
      indexedParts(7, ["day"]).map((part, index) => [part, { [`past_${index + 1}`]: true }]),
    ),
  },
} as const satisfies Meta;
export const props = z.strictObject({
  habits: z
    .array(
      z
        .strictObject({
          name: text(20),
          icon,
          days: z.array(z.boolean()).min(7).max(7),
        })
        .overwrite((habit) => ({
          ...habit,
          ...Object.fromEntries(
            habit.days.flatMap((done, index) => [
              [`day_${index + 1}`, done],
              [`past_${index + 1}`, index <= (new Date().getDay() + 6) % 7],
            ]),
          ),
        })),
    )
    .min(1)
    .max(6),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    habits: seedTitles(cast, 2, 20).map((name) => ({
      name,
      icon: "check",
      days: Array.from({ length: 7 }, () => false),
    })),
  };
}
export const examples = [
  {
    habits: [
      { name: "Stretch", icon: "check", days: [false, true, true, false, false, false, false] },
      { name: "Drink water", icon: "drop", days: [true, true, true, false, false, false, false] },
    ],
  },
  { habits: [{ name: "Walk", icon: "check", days: [true, false, true, false, false, false, false] }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("HabitGrid");
export const probes = [
  choose(
    "Show stretch, water and walking down the side of a seven-day grid and tick each day's habit independently",
  ),
  choose(
    "Show how many consecutive days I've kept one walking habit, not several habits in a grid",
    "Streak",
  ),
  write(
    "This week's stretch and water habits, check and drop icons, both only Monday checked, seven Monday-first days",
  ),
  read("Mark Monday's stretching as done", { address: "h1/r1/day_1", action: "check" }),
] satisfies Probe[];
