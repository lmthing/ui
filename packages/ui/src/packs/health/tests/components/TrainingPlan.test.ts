import { expect, it } from "vitest";
import { components, createRegistry, packReady, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.TrainingPlan;
const ready = String(meta.status) === "ready";
const [week, list] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const at = (part: string) => `home/p1/${part}`;
const html = (input: object = week, state: "filled" | "empty" | "loading" | "success" | "error" = "filled") =>
  renderInstance(meta.id, input, state, theme, { component: "p1" });
const host = (input: object = week, state: StateName = "filled") => {
  const events: [string, string][] = [];
  const runtime = createScreenController({
    screen: { id: "home", components: [{ id: "p1", c: meta.id, ...input, state }] },
    defs: components,
    onLink: (goto, address) => events.push([goto, address]),
  });
  return { runtime, events };
};

it("accepts both structures and validates exact schedule, text, and numeric bounds", () => {
  for (const p of examples) expect(props.safeParse(p).success).toBe(true);
  const day = { week: 1, day: 1, label: "x".repeat(24), minutes: 240, rest: false, done: true };
  expect(
    props.safeParse({
      title: "x".repeat(32),
      weeks: 12,
      currentWeek: 12,
      days: Array.from({ length: 28 }, (_, i) => ({ ...day, week: 9 + Math.floor(i / 7), day: (i % 7) + 1 })),
    }).success,
  ).toBe(true);
  for (const patch of [
    { title: "x".repeat(33) },
    { weeks: 13 },
    { weeks: 0 },
    { currentWeek: 0 },
    { currentWeek: 4 },
    { days: [] },
    { days: [day, { ...day, label: "Duplicate" }] },
    {
      days: Array.from({ length: 29 }, (_, i) => ({ ...day, week: Math.floor(i / 7) + 1, day: (i % 7) + 1 })),
      weeks: 5,
    },
    ...[
      { week: 4 },
      { day: 8 },
      { label: "x".repeat(25) },
      { rest: "yes" },
      { done: "yes" },
      { minutes: -1 },
      { minutes: 241 },
      { minutes: Infinity },
      { goto: "Bad ID" },
      { id: "r1" },
      { visible: true },
    ].map((row) => ({ days: [{ ...day, ...row }] })),
    { programProgress: 4 },
    { style: "grid" },
  ])
    expect(props.safeParse({ ...week, ...patch }).success).toBe(false);
  expect(props.safeParse({}).success).toBe(false);
});

it("seeds cast titles or neutral placeholders, and preserves the near miss and pack gate", () => {
  const empty = { things: [], items: [] };
  const cast = {
    things: [{ type: "record", fields: ["title"] }],
    items: [{ id: "a", type: "record", sample: true, title: "Morning plan" }],
  };
  expect(fallback({ cast: empty })).toMatchObject({ title: "Item one", weeks: 1, currentWeek: 1 });
  expect(fallback({ cast })).toMatchObject({
    title: "Morning plan",
    days: [{ label: "Morning plan", minutes: 0 }],
  });
  expect(
    props.safeParse(fallback({ cast: { ...cast, items: [{ ...cast.items[0]!, title: 3 }] } })).success,
  ).toBe(true);
  expect(meta).toMatchObject({ tier: "phone", weight: 3, dense: true });
  expect(meta).not.toHaveProperty("confirmParts");
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
  expect(createRegistry({ packs: ["health"] }).ids.includes(meta.id)).toBe(packReady("health"));
});

it.runIf(ready)("keeps addressed rows stable across structure and detail, and never links a rest day", () => {
  const filled = html();
  const parts = [...filled.matchAll(/data-testid="(home\/p1\/[^"]+)"/g)].map((m) => m[1]);
  expect(new Set(parts).size).toBe(parts.length);
  for (const part of [
    "root",
    "week",
    "title",
    "progress",
    "week_progress",
    "r1/root",
    "r1/minutes",
    "r1/done",
    "r1/trail",
    "r2/rest",
    "r3/day",
  ])
    expect(parts).toContain(at(part));
  expect(elementAt(filled, at("r1/root")).attributes).toContain('role="link"');
  expect(elementAt(filled, at("r1/done")).attributes).toContain('aria-checked="true"');
  for (const part of ["r2/done", "r2/trail", "r6/root"]) expect(parts).not.toContain(at(part));
  const brief = html({ ...week, detail: "brief" });
  expect(brief).not.toMatch(/data-testid="[^"]*\/minutes"/);
  expect(brief).toContain(at("r2/rest"));
  const sequential = html(list);
  expect(sequential).not.toContain(at("week"));
  expect(sequential.indexOf(at("r1/root"))).toBeLessThan(sequential.indexOf(at("r3/root")));
  expect(sequential).toContain(at("r5/root"));
  expect(html({ ...week, weeks: 4, currentWeek: 4 })).toContain("No workouts planned for this week.");
});

it.each(["empty", "loading", "error"] as const)("has no actions in %s", (state) => {
  if (ready) {
    const output = html(week, state);
    expect(output).toContain(at("root"));
    expect(output).not.toMatch(/role="(?:radio|checkbox|link)"/);
    expect(output).toContain(
      { empty: "Nothing here yet", loading: 'aria-busy="true"', error: "Progress not saved" }[state],
    );
  }
  const { runtime } = host(week, state);
  try {
    for (const part of ["week", "r1", "r1/done", "r3/done"])
      expect(runtime.actionsAt(`p1/${part}`)).toEqual([]);
  } finally {
    runtime.dispose();
  }
});

it("switches weeks with the chip value and updates completion and links at the same stamped addresses", () => {
  const days = week.days.map((d) => (d.rest ? { ...d, goto: "invalid_rest_link" } : d));
  const { runtime, events } = host({ ...week, days });
  const select = (value: string | number) => runtime.act({ address: "p1/week", action: "select", value });
  try {
    expect(runtime.actionsAt("p1/r2")).toEqual([]);
    expect(runtime.actionsAt("p1/r2/done")).toEqual([]);
    expect(runtime.actionsAt("p1/r7/done")).toEqual([]);
    expect(runtime.read()).toContain("Week 1 · 1 of 4 completed");
    expect(runtime.press(at("r3/done")).ok).toBe(true);
    expect(runtime.read()).toContain("Plan progress · 2 of 7 completed");
    expect(events).toEqual([]);
    expect(runtime.press(at("r3/root")).ok).toBe(true);
    expect(events).toEqual([["hill_intervals", "home/p1/r3"]]);
    expect(select("2").ok).toBe(true);
    expect(select(4).ok).toBe(false);
    expect(runtime.snapshotScreen().components[0]).toMatchObject({ currentWeek: 2 });
    expect(runtime.actionsAt("p1/r3/done")).toEqual([]);
    expect(runtime.actionsAt("p1/r7/done")).toEqual(["check"]);
    expect(runtime.read()).toContain("Week 2 · 0 of 2 completed");
    expect(runtime.press(at("r7/done")).ok).toBe(true);
    expect(runtime.read()).toContain("Week 2 · 1 of 2 completed");
    expect(select(1).ok).toBe(true);
    expect(runtime.read()).toContain("Week 1 · 2 of 4 completed");
    expect(runtime.press(at("r3/done")).ok).toBe(true);
    expect(runtime.read()).toContain("Plan progress · 2 of 7 completed");
  } finally {
    runtime.dispose();
  }
});

it("retains the schedule on success and leaves the list free of the week-select action", () => {
  if (ready) expect(html(week, "success")).toContain("Workout marked complete");
  const done = host(week, "success"),
    sequential = host(list);
  try {
    expect(done.runtime.actionsAt("p1/r3/done")).toEqual(["check"]);
    expect(done.runtime.read()).toContain("Workout marked complete");
    expect(sequential.runtime.actionsAt("p1/week")).toEqual([]);
    expect(sequential.runtime.actionsAt("p1/r5/done")).toEqual(["check"]);
  } finally {
    done.runtime.dispose();
    sequential.runtime.dispose();
  }
});
