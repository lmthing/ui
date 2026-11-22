import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, planAct, readScreen, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const sequence: Definition = {
  ...components.Button,
  meta: {
    ...components.Button.meta,
    id: "SequenceFixture",
    sequence: {
      seek: "position",
      item: "root",
      cursor: "cursor",
      steps: { previous: "previous", next: "next" },
      controls: { part: "transport", intervalMs: 250 },
    },
    actions: {
      parts: {
        position: ["seek"],
        previous: ["decrement"],
        next: ["increment"],
        transport: ["play", "pause", "stop"],
      },
      items: { root: ["seek"] },
    },
    items: { key: "panels", parts: ["root"], visibleWhen: { hidden: false } },
  },
  props: z.strictObject({
    cursor: z.int().nonnegative().optional(),
    panels: z.array(z.strictObject({ hidden: z.boolean() })),
  }),
};
const defs = { SequenceFixture: sequence };
const screen = {
  id: "s",
  components: [
    { id: "q", c: "SequenceFixture", panels: [false, true, false, false].map((hidden) => ({ hidden })) },
  ],
};
const seek = (value: number) => ({ address: "q/position", action: "seek", value });

it("validates integer bounds and addresses against the same ordered visible sequence it reads", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain("[q/position seek = 0; range 0..2]");
  expect(before).toContain("[q/r3 seek:1]");
  expect(before).not.toContain("q/r2");
  for (const value of [-1, 1.5, 3, Infinity])
    expect(planAct(screen, defs, {}, [seek(value)])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(planAct(screen, defs, {}, [{ address: "q/r3", action: "seek", value: 0 }]).ok).toBe(false);
  const steps = [
    { address: "q/r3", action: "seek" },
    { address: "q/next", action: "increment" },
  ];
  const result = planAct(screen, defs, {}, steps);
  expect(result.ok && readScreen(screen, defs, result.values)).toContain("[q/position seek = 2; range 0..2]");
  expect(planAct(screen, defs, {}, [...steps, { address: "q/next", action: "increment" }])).toMatchObject({
    ok: false,
    at: 2,
  });
  const empty = { ...screen, components: [{ ...screen.components[0]!, panels: [] }] };
  expect(readScreen(empty, defs)).not.toMatch(/seek|play/);
  expect(planAct(empty, defs, {}, [seek(0)]).ok).toBe(false);
});

it("mounts a single discrete clock, preserves pause progress and snapshots the cursor", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const runtime = createScreenController({ defs, screen, onChange: vi.fn() });
  const current = () => runtime.snapshotScreen().components[0]?.cursor;
  try {
    expect(runtime.press("q/r3").ok).toBe(true);
    expect(current()).toBe(1);
    expect(runtime.press("q/previous").ok).toBe(true);
    expect(runtime.press("q/transport").ok).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(current()).toBe(0);
    runtime.mount();
    vi.advanceTimersByTime(100);
    expect(runtime.press("q/transport").ok).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(current()).toBe(0);
    expect(runtime.press("q/transport").ok).toBe(true);
    vi.advanceTimersByTime(149);
    expect(current()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(current()).toBe(1);
    const live = runtime.liveControls(sequence.meta, screen.components[0]!, "q");
    expect(live).toMatchObject({ cursor: 1, sequencePlaying: true });
    vi.advanceTimersByTime(500);
    expect(current()).toBe(2);
    expect(runtime.read()).toContain("[q/transport play:paused]");
    expect(runtime.act({ address: "q/transport", action: "stop" }).ok).toBe(true);
    expect(current()).toBe(0);
    runtime.press("q/transport");
    runtime.dispose();
    vi.advanceTimersByTime(1000);
    expect(current()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    runtime.dispose();
    vi.useRealTimers();
  }
});

it("snapshots the same bounded cursor when the host removes panels", () => {
  let count = 3;
  const narrowed: Definition = {
    ...sequence,
    meta: {
      ...sequence.meta,
      deviceData: ["rows"],
      items: {
        ...sequence.meta.items!,
        deviceData: { rows: (data) => data.rows ?? [], schema: z.strictObject({ hidden: z.boolean() }) },
      },
    },
  };
  const runtime = createScreenController({
    defs: { SequenceFixture: narrowed },
    screen,
    get deviceData() {
      return { rows: Array.from({ length: count }, () => ({ hidden: false })) };
    },
  });
  try {
    expect(runtime.act(seek(2)).ok).toBe(true);
    count = 1;
    expect(runtime.read()).toContain("[q/position seek = 0; range 0..0]");
    expect(runtime.snapshotScreen().components[0]).toMatchObject({
      cursor: 0,
      panels: screen.components[0]!.panels,
    });
    expect(runtime.act(seek(2)).ok).toBe(false);
  } finally {
    runtime.dispose();
  }
});

it("supports one-based press navigation and a counted set scrubber without wire items", () => {
  let now = 0;
  const counted: Definition = {
    ...sequence,
    meta: {
      ...components.Button.meta,
      id: "CountedFixture",
      actions: { parts: { frame: ["set"], previous: ["press"], next: ["press"] } },
      sequence: {
        cursor: "frame",
        first: 1,
        count: "total",
        seek: "frame",
        seekAction: "set",
        steps: { previous: "previous", next: "next" },
        controls: { part: "play", intervalMs: 250, start: true },
      },
    },
    props: z.strictObject({ frame: z.int().optional(), total: z.int().min(1) }),
  };
  const runtime = createScreenController({
    defs: { CountedFixture: counted },
    screen: { id: "s", components: [{ id: "q", c: "CountedFixture", frame: 1, total: 3 }] },
    now: () => now,
  });
  try {
    expect(runtime.read()).toContain("[q/frame set = 1; range 1..3]");
    expect(runtime.press("q/previous").ok).toBe(false);
    expect(runtime.press("q/next").ok).toBe(true);
    expect(runtime.snapshotScreen().components[0]?.frame).toBe(2);
    for (const value of [0, 2.5, 4])
      expect(runtime.act({ address: "q/frame", action: "set", value }).ok).toBe(false);
    expect(runtime.act({ address: "q/frame", action: "set", value: 3 }).ok).toBe(true);
    expect(runtime.press("q/next").ok).toBe(false);
    runtime.reset();
    now = 1000;
    runtime.tick();
    expect(runtime.snapshotScreen().components[0]?.frame).toBe(1);
    runtime.mount();
    now = 1250;
    runtime.tick();
    expect(runtime.snapshotScreen().components[0]?.frame).toBe(2);
  } finally {
    runtime.dispose();
  }
});
