import { expect, it } from "vitest";
import { planDay, planOrder, planReading, planView } from "../../copy";

const plan = {
  title: "Trail schedule",
  style: "week",
  currentWeek: 1,
  weeks: 3,
  days: [
    { week: 2, day: 1, label: "Long walk", minutes: 35, rest: false, done: false },
    { week: 1, day: 7, label: "Recovery", minutes: 0, rest: true, done: true },
    { week: 1, day: 1, label: "Easy walk", minutes: 20, rest: false, done: true },
  ],
} as const;
const seed = { ...plan, days: [...plan.days] };

it("counts only workouts in each week and program, without changing row order or visibility", () => {
  const view = planView(seed);
  expect(view.programProgress).toEqual({ count: 2, done: 1 });
  expect(view.weeklyProgress).toEqual([
    { count: 1, done: 1 },
    { count: 1, done: 0 },
    { count: 0, done: 0 },
  ]);
  expect(view.days.map(({ visible }) => visible)).toEqual([false, true, true]);
  expect(planOrder(view.days).map(({ label }) => label)).toEqual(["Easy walk", "Recovery", "Long walk"]);
  expect(view.days[0]?.label).toBe("Long walk");
});

it("reads only the chosen week or all list weeks, and hides only duration in brief", () => {
  const view = { ...seed, ...planView(seed) };
  expect(planReading(view, "filled")).toEqual([
    "Plan progress · 1 of 2 completed",
    "Week 1",
    "Week 2",
    "Week 3",
    "Week 1 · 1 of 1 completed",
    "Mon · Easy walk · 20 min · Complete",
    "Sun · Recovery · Rest",
  ]);
  const list = { ...view, style: "list", detail: "brief" } as const;
  expect(planReading(list, "success")).toEqual([
    "Workout marked complete",
    "Plan progress · 1 of 2 completed",
    "Week 1 · 1 of 1 completed",
    "Mon · Easy walk · Complete",
    "Sun · Recovery · Rest",
    "Week 2 · 0 of 1 completed",
    "Mon · Long walk · Not complete",
  ]);
  expect(planDay(seed.days[0]!, "full", "ar-u-nu-arab").minutes).toBe("٣٥ min");
});
