import { expect, it, vi } from "vitest";
import { z } from "zod";
import type { Definition, Meta } from "../../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../index";

const props = z.strictObject({
  rounds: z.int().positive(),
  pace: z.int().positive().default(3),
});
const meta: Meta = {
  id: "PacedFixture",
  group: "action",
  purpose: "Follow a paced exercise",
  pick: "Guide repeated phases",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Paced locally",
  parts: ["root", "circle"],
  states: ["filled", "success"],
  actions: { parts: { circle: ["play", "pause"] } },
  readSuccess: true,
  clocks: [
    {
      id: "pace",
      kind: "up",
      prop: "elapsed",
      runningProp: "running",
      max: ({ rounds, pace }) => Number(rounds) * Number(pace),
      start: { part: "circle", action: "play" },
      stop: { part: "circle", action: "pause" },
      zero: { state: "success" },
    },
  ],
  read: (input) => {
    const { elapsed, running } = input as { elapsed: number; running: boolean };
    return [`${elapsed}s ${running ? "running" : "paused"}`];
  },
};
const seed = { rounds: 2 };
const fixture: Definition = { meta, props, fallback: () => seed, examples: [seed], probes: [] };
const screen = { id: "s", components: [{ ...seed, id: "b1", c: meta.id }] };
const defs = { [meta.id]: fixture };
const circle = "s/b1/circle";
const step = (action: string) => ({ address: circle, action });

it("uses one clock for circle taps, agent actions, reads and completion", () => {
  vi.useFakeTimers();
  const runtime = createScreenController({ screen, defs, requireMounted: true });
  runtime.registerPart(circle);
  const live = () => runtime.liveControls(meta, props.parse(seed), "b1");
  try {
    expect(runtime.actionsAt(circle)).toEqual(["play"]);
    expect(runtime.canPress(circle)).toBe(true);
    expect(runtime.read()).toContain("0s paused [b1/circle play]");
    expect(runtime.press(circle).ok).toBe(true);
    expect(runtime.act(step("play")).ok).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(live()).toMatchObject({ elapsed: 2, running: true });
    expect(runtime.read()).toContain("2s running [b1/circle pause]");
    expect(runtime.actionsAt(circle)).toEqual(["pause"]);
    expect(runtime.press(circle).ok).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(live()).toMatchObject({ elapsed: 2, running: false });
    expect(runtime.read()).toContain("2s paused [b1/circle play]");
    expect(runtime.act(step("play"), { agent: true }).ok).toBe(true);
    vi.advanceTimersByTime(3999);
    expect(runtime.read()).toContain("5s running [b1/circle pause]");
    vi.advanceTimersByTime(1);
    expect(live()).toMatchObject({ elapsed: 6, running: false, state: "success" });
    expect(runtime.snapshotScreen().components[0]).toEqual({ ...screen.components[0], state: "success" });
    expect(runtime.read()).toContain("PacedFixture (success) 6s paused");
    expect(runtime.read()).not.toContain("[b1/circle");
    expect(runtime.store.get("s/b1/$pace")).toMatchObject({ seconds: 6, running: false });
    expect(runtime.canPress(circle)).toBe(false);
    expect(runtime.press(circle).ok).toBe(false);
  } finally {
    runtime.dispose();
    vi.useRealTimers();
  }
});

it("keeps partial active seconds on resume and projects success without a controller tick", () => {
  vi.useFakeTimers();
  try {
    const agent = createAgentAccess({ defs, store: createInteractionStore(), current: () => screen });
    expect(agent.read()).toContain("0s paused [b1/circle play]");
    expect(agent.act(step("play"), { dryRun: true }).ok).toBe(true);
    expect(agent.read()).toContain("0s paused [b1/circle play]");
    expect(agent.act(step("play")).ok).toBe(true);
    vi.advanceTimersByTime(2500);
    expect(agent.act(step("pause")).ok).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(agent.read()).toContain("2s paused [b1/circle play]");
    expect(agent.act(step("play")).ok).toBe(true);
    vi.advanceTimersByTime(3499);
    expect(agent.read()).toContain("5s running [b1/circle pause]");
    vi.advanceTimersByTime(1);
    expect(agent.read()).toContain("PacedFixture (success) 6s paused");
    expect(agent.read()).not.toContain("[b1/circle");
    expect(agent.act(step("pause")).ok).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("applies a declared reset after success for detached controls", () => {
  vi.useFakeTimers();
  const restart = { address: "b1/restart", action: "press" };
  const resettable: Definition = {
    ...fixture,
    meta: {
      ...meta,
      parts: [...meta.parts!, "restart"],
      actions: { parts: { ...meta.actions!.parts, restart: ["press"] } },
      successActions: ["restart.press"],
      clocks: [{ ...meta.clocks![0]!, reset: { part: "restart", action: "press", state: "filled" } }],
    },
  };
  const agent = createAgentAccess({
    defs: { [meta.id]: resettable },
    store: createInteractionStore(),
    current: () => screen,
  });
  try {
    expect(agent.act(restart).ok).toBe(false);
    for (let run = 0; run < 2; run++) {
      expect(agent.act(step("play")).ok).toBe(true);
      vi.advanceTimersByTime(6000);
      expect(agent.read()).toContain("PacedFixture (success) 6s paused [b1/restart press]");
      expect(agent.act(restart).ok).toBe(true);
      expect(agent.read()).toContain("0s paused [b1/circle play]");
    }
  } finally {
    vi.useRealTimers();
  }
});

it("continues timing and accepts pause when detached access takes over a mounted clock", () => {
  vi.useFakeTimers();
  const store = createInteractionStore();
  const controller = createScreenController({ defs, screen, store });
  try {
    expect(controller.press(circle).ok).toBe(true);
    controller.dispose();
    vi.advanceTimersByTime(2000);
    const agent = createAgentAccess({ defs, store, current: () => screen });
    expect(agent.read()).toContain("2s running [b1/circle pause]");
    expect(agent.act(step("pause")).ok).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(agent.read()).toContain("2s paused [b1/circle play]");
  } finally {
    controller.dispose();
    vi.useRealTimers();
  }
});
