import { expect, it, vi } from "vitest";
import { z } from "zod";
import type { Definition, Values } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const def: Definition = {
  meta: {
    id: "Session",
    group: "input",
    region: "body",
    weight: 1,
    tier: "phone",
    purpose: "",
    pick: "",
    realPath: "",
    actions: { parts: { timer: ["start", "stop"], lap: ["press"] } },
    clocks: [
      {
        id: "active",
        kind: "up",
        max: 1,
        prop: "seconds",
        runningProp: "active",
        start: { part: "timer", action: "start" },
        stop: { part: "timer", action: "stop" },
        journal: {
          rows: "rows",
          lap: { part: "lap", max: 2 },
          record: ({ count, durationMs }) => ({ count, durationMs }),
        },
      },
    ],
    read: (props) => [`${(props as Values).seconds}s`],
  },
  props: z.strictObject({
    rows: z.array(z.strictObject({ count: z.int(), durationMs: z.int() })),
  }),
  fallback: () => ({ rows: [] }),
  examples: [],
  probes: [],
};

it("keeps an active journal writable after the displayed clock caps and commits only on successful Stop", () => {
  let now = 5000;
  const input = { rows: [] };
  const screen = { id: "s", components: [{ id: "j", c: "Session", ...input }] };
  const runtime = createScreenController({ screen, defs: { Session: def }, now: () => now });
  const stop = { address: "s/j/timer", action: "stop" };
  const rows = () => runtime.snapshotScreen().components[0]?.rows;
  try {
    expect(runtime.press("j/timer").ok).toBe(true);
    now = 6500;
    runtime.tick();
    expect(runtime.liveControls(def.meta, input, "j")).toMatchObject({ active: true, seconds: 1 });
    expect(runtime.press("j/lap").ok).toBe(true);
    now = 8000;
    expect(runtime.read()).toContain("[j/timer stop]");
    expect(runtime.act([stop, stop])).toMatchObject({ ok: false, at: 1 });
    expect(runtime.act(stop, { dryRun: true }).ok).toBe(true);
    expect(rows()).toEqual([]);
    expect(runtime.act(stop).ok).toBe(true);
    expect(rows()).toEqual([{ count: 1, durationMs: 3000 }]);
    expect(runtime.act(stop).ok).toBe(false);
  } finally {
    runtime.dispose();
  }
});

it("starts mounted passive ticks when an edit selects a trusted timestamp", () => {
  vi.useFakeTimers();
  vi.setSystemTime(8000);
  const passive: Definition = {
    ...def,
    meta: {
      ...def.meta,
      deviceData: ["starts"],
      clocks: [
        {
          id: "elapsed",
          kind: "up",
          prop: "seconds",
          timestamp: (data, { slot }) =>
            typeof slot === "number" && typeof data.starts?.[slot] === "number"
              ? data.starts[slot]
              : undefined,
        },
      ],
      actions: { parts: { slot: ["set"] } },
      set: { slot: { prop: "slot", integer: true } },
    },
    props: z.strictObject({ slot: z.int() }),
  };
  const screen = { id: "s", components: [{ id: "j", c: "Session", slot: 0 }] };
  const runtime = createScreenController({
    screen,
    defs: { Session: passive },
    deviceData: { starts: [null, 5000] },
  });
  const onChange = vi.fn();
  const unsubscribe = runtime.store.subscribe(onChange);
  try {
    runtime.mount();
    expect(runtime.read()).toContain("0s");
    expect(runtime.act({ address: "j/slot", action: "set", value: 1 }).ok).toBe(true);
    expect(runtime.read()).toContain("3s");
    onChange.mockClear();
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(runtime.read()).toContain("4s");
  } finally {
    unsubscribe();
    runtime.dispose();
    vi.useRealTimers();
  }
});
