import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Workout;
const set = { weight: 40, reps: 8, done: false };
const exercise = { name: "Bench press", sets: [set] };
const input = { exercises: [exercise], rest: 5 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const at = (part: string) => `home/w1/${part}`;
describe("Workout contract and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { exercises: [] },
    { exercises: Array(9).fill(exercise) },
    { ...input, color: "red" },
    { ...input, unit: "g" },
    { ...input, rest: 601 },
    { ...input, rest: -1 },
    { ...input, elapsed: 86401 },
    ...["", "  ", "x".repeat(29)].map((name) => ({ exercises: [{ ...exercise, name }] })),
    ...[[], Array(7).fill(set)].map((sets) => ({ exercises: [{ ...exercise, sets }] })),
    ...[
      { weight: -1 },
      { weight: 1001 },
      { reps: 1000 },
      { reps: 2.5 },
      { seconds: 86401 },
      { remaining: 601 },
      { done: "yes" },
      { id: "r1" },
      { pixels: 4 },
    ].map((fields) => ({
      exercises: [{ ...exercise, sets: [{ ...set, ...fields }] }],
    })),
  ])("rejects unbounded, unknown or presentation input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
  it("preserves defaults and accepts exact dense and numeric bounds", () => {
    expect(props.parse({ exercises: [{ ...exercise, name: "  Bench press  " }] })).toMatchObject({
      exercises: [exercise],
      rest: 90,
      unit: "kg",
    });
    expect(
      props.safeParse({
        exercises: Array(8).fill({
          name: "x".repeat(28),
          sets: Array(6).fill({
            weight: 1000,
            reps: 999,
            seconds: 86400,
            remaining: 600,
            done: true,
          }),
        }),
        elapsed: 86400,
        rest: 600,
      }).success,
    ).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["exercises"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("Workout fallback and probes", () => {
  it("uses only cast titles or shared placeholders with the app language", () => {
    const empty = { things: [], items: [] };
    const casts: CastLike[] = [
      empty,
      { ...empty, items: [{ id: "b", type: "record", sample: true, name: "Training" }] },
      { ...empty, items: [{ id: "b", type: "record", sample: true, name: 42 }] },
      { ...empty, items: [{ id: "b", type: "record", sample: true, name: "x".repeat(80) }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).exercises.map(({ name }) => name)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: casts[1]! }).exercises[0]!.name).toBe("Training");
    expect(fallback({ cast: casts[2]! }).exercises[0]!.name).toBe("Item one");
  });
  it("retains the core-first near miss, tier, dense weight and read targets", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 3, dense: true });
    expect(meta.pick).toContain("Checklist");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", expect: "Workout" }),
        expect.objectContaining({ kind: "read", expect: { address: "w1/r1/done_1", action: "toggle" } }),
        expect.objectContaining({ kind: "read", expect: { address: "w1/r1/weight_2", action: "set" } }),
      ]),
    );
  });
});

describe.runIf(String(meta.status) === "ready")("Workout states and parts", () => {
  it("draws every set part once and preserves duration, rest and unit readings", () => {
    for (const example of examples) {
      const html = renderInstance("Workout", example, "filled", theme, { component: "w1" });
      const reading = readComponent(components.Workout, example, "w1").join("\n");
      const parts = [...html.matchAll(/data-testid="(home\/w1\/[^"]+)"/g)].map((m) => m[1]);
      expect(new Set(parts).size).toBe(parts.length);
      for (const part of ["root", "time", "finish", "r1/root", "r1/name", "r1/set_2", "r1/label_2"])
        expect(parts).toContain(at(part));
      expect(parts.includes(at("rest"))).toBe(example.rest > 0);
      expect(elementAt(html, at("r1/done_1")).attributes).toContain('role="checkbox"');
      expect(elementAt(html, at("r1/weight_2")).attributes).toContain('role="spinbutton"');
      expect(elementAt(html, at("finish")).attributes).toContain('role="button"');
      for (const value of [`Weight (${example.unit})`, "Reps", "Set 2", "Elapsed time", "Finish workout"])
        expect(reading).toContain(value);
    }
    const duration = renderInstance("Workout", examples[0], "filled", theme);
    const resting = renderInstance("Workout", examples[1], "filled", theme);
    expect(duration).toMatch(/data-testid="home\/c1\/r2\/label_1"[^>]*>Set 1 · 0:45/);
    expect(elementAt(duration, "home/c1/r2/done_1").attributes).toContain('role="checkbox"');
    expect(duration).not.toMatch(/data-testid="home\/c1\/r2\/(?:weight|reps)_1/);
    expect(resting).toContain("Rest · 0:36");
  });
  it.each(["empty", "success"] as const)("replaces the workout with a non-interactive %s state", (state) => {
    const html = renderInstance("Workout", { ...input, elapsed: 65 }, state, theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).not.toMatch(/role="(?:checkbox|button|textbox|spinbutton)"/);
    expect(html).toContain(state === "empty" ? "Nothing here yet" : "Workout complete");
    if (state === "success") expect(html).toContain("Elapsed time · 1:05");
  });
  it("omits the rest action for zero rest", () => {
    const disabled = { ...input, rest: 0 };
    const html = renderInstance("Workout", disabled, "filled", theme);
    expect(html).not.toContain('data-testid="home/c1/rest"');
    const actions = affordancesOf(meta, stampItemIds(meta, props.parse(disabled)), "w1");
    expect(actions.map(({ address }) => address)).not.toContain("w1/rest");
  });
});

function setup(state: "filled" | "empty" | "success" = "filled") {
  let now = 1000;
  const screen = { id: "home", components: [{ id: "w1", c: "Workout", ...input, state }] };
  const runtime = createScreenController({ screen, defs: components, now: () => now });
  const agent = createAgentAccess({ defs: components, store: runtime.store, current: () => screen, runtime });
  return {
    runtime,
    agent,
    live: () => runtime.snapshotScreen().components[0]!,
    tick: (seconds: number) => {
      now += seconds * 1000;
      runtime.tick();
    },
  };
}

describe("Workout read and act", () => {
  it("sets bounded values and starts, stops and finishes through the public dispatcher", () => {
    const { runtime, agent, live, tick } = setup();
    try {
      expect(agent.act({ address: "w1/rest", action: "stop" }).ok).toBe(false);
      for (const [part, value, ok] of [
        ["weight_1", 42.5, true],
        ["reps_1", 9, true],
        ["weight_1", 1001, false],
        ["reps_1", 8.5, false],
        ["weight_2", 45, false],
      ] as const)
        expect(agent.act({ address: `w1/r1/${part}`, action: "set", value }).ok).toBe(ok);
      expect(runtime.press(at("r1/done_1")).ok).toBe(true);
      tick(2);
      expect(agent.read()).toContain("Rest · 0:03");
      expect(agent.read()).toContain("Weight (kg) 42.5");
      expect(agent.act({ address: "w1/rest", action: "stop" }).ok).toBe(true);
      expect(runtime.actionsAt("w1/rest")).toEqual([]);
      tick(4);
      expect(live()).toMatchObject({ elapsed: 6, exercises: [{ sets: [{ done: true, remaining: 3 }] }] });
      expect(runtime.press(at("finish")).ok).toBe(true);
      expect(runtime.confirmation).toBeUndefined();
      tick(60);
      expect(live()).toMatchObject({ state: "success", elapsed: 6 });
      expect(agent.act({ address: "w1/r1/done_1", action: "toggle" }).ok).toBe(false);
      expect(agent.read()).toContain("Workout (success)");
    } finally {
      runtime.dispose();
    }
  });
  it.each(["empty", "success"] as const)("offers no finish or set actions in %s", (state) => {
    const { runtime } = setup(state);
    try {
      expect(runtime.actionsAt("w1/finish")).toEqual([]);
      expect(runtime.actionsAt("w1/r1/done_1")).toEqual([]);
    } finally {
      runtime.dispose();
    }
  });
});
