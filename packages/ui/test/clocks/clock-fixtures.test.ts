import { afterEach, expect, it, vi } from "vitest";
import { components, readPrompt, type Values } from "@lmthing/ui/catalog";
import { single, multiple, setup } from "./clock-fixtures";
afterEach(() => vi.useRealTimers());
it("counts up through the public agent API, pauses between ticks, resumes and resets", () => {
  const def = {
    ...single,
    meta: { ...single.meta, clocks: [{ ...single.meta.clocks![0]!, kind: "up" as const, max: 86400 }] },
  };
  const { runtime, agent, advance, live } = setup(def, { seconds: 10 });
  expect(runtime.actionsAt("f1/begin")).toEqual(["start"]);
  expect(runtime.actionsAt("f1/end")).toEqual([]);
  expect(agent.act({ address: "f1/begin", action: "start" }).ok).toBe(true);
  advance(3500, false);
  expect(agent.read()).toContain("remaining 13");
  expect(live().remaining).toBe(13);
  expect(agent.act({ address: "f1/begin", action: "start" }).ok).toBe(false);
  expect(agent.act({ address: "f1/end", action: "stop" }).ok).toBe(true);
  advance(5000);
  expect(live().remaining).toBe(13);
  agent.act({ address: "f1/begin", action: "start" });
  advance(2000);
  expect(agent.read()).toContain("remaining 15");
  agent.act({ address: "f1/reset", action: "press" });
  expect(live().remaining).toBe(10);
  expect(runtime.actionsAt("f1/end")).toEqual([]);
  expect(runtime.actionsAt("f1/reset")).toEqual([]);
  runtime.dispose();
});
it("finishes a countdown at zero and reports the finished state during and after ticking", () => {
  const def = {
    ...single,
    meta: { ...single.meta, clocks: [{ ...single.meta.clocks![0]!, zero: { state: "success" as const } }] },
  };
  const { runtime, agent, advance, live } = setup(def, { seconds: 3 });
  agent.act({ address: "f1/begin", action: "start" });
  advance(2000, false);
  expect(agent.read()).toContain("remaining 1");
  advance(3000, false);
  expect(agent.read()).toContain("ClockFixture (success)");
  expect(live()).toMatchObject({ remaining: 0, state: "success" });
  runtime.tick();
  expect(runtime.store.get("test/f1/$clock")).toMatchObject({ running: false, seconds: 0 });
  expect(agent.read()).not.toContain("[f1/begin");
  runtime.reset();
  expect(live()).toMatchObject({ remaining: 3 });
  runtime.dispose();
});
it("runs per-item countdowns independently and sets holder finish flags", () => {
  const { runtime, agent, advance, live } = setup(multiple, {
    timers: [
      { label: "First", seconds: 3, finished: false },
      { label: "Second", seconds: 10, finished: false },
    ],
  });
  agent.act([
    { address: "f1/r1/begin", action: "start" },
    { address: "f1/r2/begin", action: "start" },
  ]);
  advance(4000);
  expect(live().timers).toMatchObject([
    { remaining: 0, finished: true },
    { remaining: 6, finished: false },
  ]);
  expect(agent.read()).toContain("First 0 true");
  expect(agent.read()).toContain("Second 6 false");
  expect(runtime.actionsAt("f1/r1/end")).toEqual([]);
  expect(runtime.actionsAt("f1/r2/end")).toEqual(["stop"]);
  agent.act({ address: "f1/r2/end", action: "stop" });
  advance(10000);
  expect((live().timers as Values[])[1]!.remaining).toBe(6);
  agent.act({ address: "f1/r1/reset", action: "press" });
  expect((live().timers as Values[])[0]).toMatchObject({ remaining: 3, finished: false });
  runtime.dispose();
});
it("keeps clock batches atomic and dry runs side-effect free", () => {
  const { runtime, agent } = setup(single, { seconds: 10 });
  const before = runtime.store.snapshot();
  expect(agent.act({ address: "f1/begin", action: "start" }, { dryRun: true }).ok).toBe(true);
  expect(
    agent.act([
      { address: "f1/begin", action: "start" },
      { address: "f1/begin", action: "start" },
    ]),
  ).toMatchObject({ ok: false, at: 1 });
  expect(runtime.store.snapshot()).toEqual(before);
  runtime.dispose();
});
it("schedules automatic clocks using timestamps and releases the interval after zero", () => {
  vi.useFakeTimers();
  const def = {
    ...single,
    meta: {
      ...single.meta,
      clocks: [{ id: "clock", kind: "down" as const, from: "seconds", prop: "remaining" }],
    },
  };
  const { runtime, advance, live } = setup(def, { seconds: 3 });
  runtime.mount();
  expect(vi.getTimerCount()).toBe(1);
  advance(4000, false);
  vi.advanceTimersByTime(1000);
  expect(live().remaining).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
  runtime.dispose();
});
it("keeps every core read prompt identical when clock declarations are removed", () => {
  const def = components.Timer;
  const { clocks: _clocks, ...meta } = def.meta;
  for (const probe of def.probes) {
    if (probe.kind !== "read") continue;
    const instance = probe.expect.address.split("/")[0]!;
    expect(readPrompt(def, probe.screen, instance, probe.task)).toBe(
      readPrompt({ ...def, meta }, probe.screen, instance, probe.task),
    );
  }
});
