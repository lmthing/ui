import { expect, it, vi } from "vitest";
import { z } from "zod";
import { planAct, readScreen, type Definition, type Values } from "../index";
import { createScreenController } from "../../../kit/interact";

const props = z.strictObject({
  week: z.iso.date(),
  target: z.string(),
  rows: z
    .array(z.strictObject({ target: z.string(), start: z.iso.datetime(), end: z.iso.datetime() }))
    .max(2),
});
const def: Definition = {
  props,
  meta: {
    id: "Log",
    purpose: "",
    pick: "",
    region: "body",
    group: "input",
    weight: 1,
    tier: "phone",
    realPath: "",
    deviceData: ["targets"],
    actions: { parts: { timer: ["start", "stop"] }, items: { remove: ["press"] } },
    items: {
      key: "rows",
      parts: ["remove"],
      records: { keys: ["target", "start"], parts: { remove: { action: "press", remove: true } } },
    },
    clocks: [
      {
        id: "elapsed",
        kind: "up",
        prop: "seconds",
        runningProp: "running",
        start: { part: "timer", action: "start" },
        stop: { part: "timer", action: "stop" },
        commitOnStop: {
          rows: "rows",
          week: "week",
          selection: ["target"],
          timeZone: () => "America/New_York",
          record: ({ start, end }, { target }, data) =>
            data.targets?.includes(target)
              ? { target, start: new Date(start).toISOString(), end: new Date(end).toISOString() }
              : undefined,
        },
      },
    ],
  },
  examples: [],
  probes: [],
  fallback: () => ({ week: "2026-03-02", target: "a", rows: [] }),
};
const defs = { Log: def };
const base = { id: "l1", c: "Log", week: "2026-03-02", target: "a", rows: [] };
const screen = { id: "s", components: [base] };
const data = { targets: ["a"] };
const from = Date.parse("2026-03-08T06:59:59Z");
const end = from + 3000;
const start = { address: "l1/timer", action: "start" };
const stop = { address: "l1/timer", action: "stop" };
const remove = (row: string) => ({ address: `l1/${row}/remove`, action: "press" });
const confirm = { address: "confirm/confirm", action: "press" };

it("commits whole elapsed sessions once, rolls back a bad batch, and confirms deletion", () => {
  let now = from;
  const onChange = vi.fn();
  const runtime = createScreenController({ screen, defs, deviceData: data, now: () => now, onChange });
  const saved = () => runtime.snapshotScreen().components[0]?.rows;
  try {
    expect(runtime.read()).toContain("[l1/timer start]");
    expect(runtime.act(start).ok).toBe(true);
    expect(runtime.act(start).ok).toBe(false);
    now = end;
    expect(runtime.read()).toContain("[l1/timer stop]");
    expect(runtime.act([stop, stop]).ok).toBe(false);
    expect(runtime.act(stop, { dryRun: true }).ok).toBe(true);
    expect(saved()).toEqual([]);
    expect(runtime.store.get("s/l1/$elapsed")).toMatchObject({ running: true });
    expect(runtime.act(stop).ok).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
    const record = { target: "a", start: new Date(from).toISOString(), end: new Date(end).toISOString() };
    expect(saved()).toEqual([record]);
    expect(onChange.mock.lastCall?.[1]["s/l1/$elapsed"]).toMatchObject({ running: false, seconds: 3 });
    expect(runtime.act(stop).ok).toBe(false);
    expect(runtime.act(remove("r1")).ok).toBe(true);
    expect(saved()).toEqual([record]);
    expect(runtime.act(confirm).ok).toBe(true);
    expect(saved()).toEqual([]);
    expect(runtime.act(start).ok).toBe(true);
    now += 1000;
    expect(runtime.act(stop).ok).toBe(true);
    expect(runtime.read()).toContain("[l1/r2/remove press]");
    expect(runtime.read()).not.toContain("[l1/r1/remove press]");
  } finally {
    runtime.dispose();
  }
});

it("shares admission between the reader and planner for missing targets, changed weeks and bad timestamps", () => {
  const started = planAct(screen, defs, {}, [start], null, "planner", data, from);
  if (!started.ok) throw new Error("Start was not admitted");
  const cases = [
    { seed: base, now: end, data: { targets: [] } },
    { seed: { ...base, target: "b" }, now: end, data: { targets: ["a", "b"] } },
    { seed: { ...base, week: "2026-03-09" }, now: end, data },
    { seed: base, now: Date.parse("2026-03-09T04:00:01Z"), data },
    { seed: base, now: from, data },
  ];
  for (const { seed, now, data } of cases) {
    const input = { ...screen, components: [seed] };
    const values: Values = { ...started.values, "s/l1/$now": now };
    expect(readScreen(input, defs, values, undefined, data)).not.toContain("[l1/timer stop]");
    expect(planAct(input, defs, values, [stop], null, "planner", data, now).ok).toBe(false);
    expect(values["s/l1/$elapsed"]).toMatchObject({ running: true });
  }
  const valid = planAct(screen, defs, started.values, [stop], null, "planner", data, end);
  expect(valid.ok).toBe(true);
});
