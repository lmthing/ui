import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "..";

// Core first: Checklist/default ticks tasks but cannot switch workout weeks, show rest days or launch linked sessions.
// prettier-ignore
export const meta = {
  id: "TrainingPlan", status: "draft", group: "input",
  purpose: "Follow a multi-week workout plan, track completion and start scheduled sessions.",
  pick: "A multi-week workout program with week and day numbers, workout duration, rest days, and completion. Not one active strength session (Workout), repeated habits (HabitGrid), a course path (Path), or ungrouped tasks to tick off (Checklist).",
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "The program and workout completion marks are stored on the device.",
  parts: ["root", "title", "week", "progress", "week_progress", "notice"],
  items: { key: "days", parts: ["root", "label", "day", "minutes", "rest", "done", "trail"] },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { parts: { week: ["select"] }, items: { done: ["check"], root: ["press"] } },
} as const satisfies c.Meta;

const week = z.int().min(1).max(12);
// prettier-ignore
const day = z.strictObject({
  week, day: z.int().min(1).max(7), label: c.text(24), minutes: z.int().min(0).max(240),
  rest: z.boolean(), done: z.boolean(), goto: c.screenId.optional(),
});

// prettier-ignore
export const props = z.strictObject({
  title: c.text(32), weeks: week, currentWeek: week, days: z.array(day).min(1).max(28),
  style: z.enum(["week", "list"]).default("week"),
}).refine(({ currentWeek, weeks }) => currentWeek <= weeks, { path: ["currentWeek"], message: "Select a week in the plan" })
  .refine(({ days, weeks }) => days.every((item) => item.week <= weeks) &&
    new Set(days.map((item) => item.week * 7 + item.day)).size === days.length,
    { path: ["days"], message: "Each week and day pair must be unique and inside the plan" });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const labels = seedTitles(cast, 3, 24, lang);
  return {
    title: seedTitles(cast, 1, 32, lang)[0]!,
    weeks: 1,
    currentWeek: 1,
    days: labels.map((label, index) => ({
      week: 1,
      day: index + 1,
      label,
      minutes: 0,
      rest: false,
      done: false,
    })),
  };
}

// prettier-ignore
export const examples = [
  { title: "Garden trail stamina", weeks: 3, currentWeek: 1, days: [
    { week: 1, day: 1, label: "Easy trail walk", minutes: 25, rest: false, done: true, goto: "trail_walk" },
    { week: 1, day: 2, label: "Rest day", minutes: 0, rest: true, done: false },
    { week: 1, day: 3, label: "Hill intervals", minutes: 30, rest: false, done: false, goto: "hill_intervals" },
    { week: 1, day: 5, label: "Lower-body strength", minutes: 35, rest: false, done: false, goto: "strength" },
    { week: 1, day: 7, label: "Steady trail walk", minutes: 40, rest: false, done: false },
    { week: 2, day: 1, label: "Easy trail walk", minutes: 30, rest: false, done: false },
    { week: 2, day: 4, label: "Hill intervals", minutes: 35, rest: false, done: false, goto: "hill_intervals" },
    { week: 3, day: 1, label: "Long trail walk", minutes: 50, rest: false, done: false },
  ] },
  { title: "Build up with Clover", weeks: 2, currentWeek: 2, style: "list", days: [
    { week: 1, day: 1, label: "Park loop", minutes: 20, rest: false, done: true },
    { week: 1, day: 4, label: "River walk", minutes: 25, rest: false, done: true },
    { week: 2, day: 1, label: "River walk", minutes: 30, rest: false, done: false, goto: "river_walk" },
    { week: 2, day: 2, label: "Rest day", minutes: 0, rest: true, done: false },
    { week: 2, day: 5, label: "Long park loop", minutes: 35, rest: false, done: false },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TrainingPlan");
// prettier-ignore
export const probes = [
  choose("Organize my 6-week workout program by training week and weekday, with session durations, rest days and a tick when each workout is finished"),
  choose("Give me checkboxes for three errands I need to finish today, with no schedule or links", "Checklist"),
  write("Title: Trail build-up. Show weeks one and two of the workout program, starting on week one. Monday of week one is an easy walk for 25 minutes, already done. Tuesday of week one is a rest day. Monday of week two is an easy walk for 30 minutes, not done."),
  read("Mark Hill intervals on Wednesday complete, without opening its workout", { address: "p1/r3/done", action: "check" }),
] satisfies c.Probe[];
