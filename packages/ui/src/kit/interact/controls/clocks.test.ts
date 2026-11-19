import { expect, it } from "vitest";
import { z } from "zod";
import { projectClocks, type Meta, type Values } from "../../../catalog";
import { createScreenController } from "../index";
import { clockChanges, initialClocks, tickClocks } from "./clocks";
const meta: Meta = {
  id: "ClockFixture",
  group: "data",
  purpose: "Measure time",
  pick: "Measure time",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local time",
  clocks: [
    {
      id: "clock",
      kind: "down",
      from: "seconds",
      prop: "remaining",
      start: { part: "begin", action: "start" },
      stop: { part: "end", action: "stop" },
      reset: { part: "reset", action: "press" },
      zero: { state: "success" },
    },
  ],
};
it("stages start, stop, reset and a finishing tick without mutating its input", () => {
  const props = { seconds: 10 };
  const values: Values = initialClocks(meta, props, 1000);
  const get = (part: string) => values[part];
  const apply = (part: string, action: string, now: number) =>
    Object.assign(values, clockChanges(meta, props, get, part, { address: part, action }, now));
  apply("begin", "start", 1000);
  apply("end", "stop", 4000);
  expect(values.$remaining).toBe(7);
  apply("reset", "press", 5000);
  expect(values.$remaining).toBe(10);
  apply("begin", "start", 6000);
  const changes = tickClocks(meta, props, get, 17000);
  expect(changes).toMatchObject({ $remaining: 0, $state: "success", $clock: { running: false } });
  expect(values.$clock).toMatchObject({ running: true });
  expect(props.seconds).toBe(10);
});
it("extends only the selected countdown, preserving phase, pause and the reset seed", () => {
  const { clocks: _clocks, ...base } = meta;
  const definition: Meta = {
    ...base,
    items: {
      key: "rows",
      parts: ["begin", "end", "reset", "more"],
      adjust: { "more.press": { prop: "remaining", delta: 60 } },
      clocks: [
        {
          ...meta.clocks![0]!,
          max: 100,
          runningProp: "running",
          zero: { prop: "finished", value: true },
        },
      ],
    },
  };
  const props = { rows: [{ seconds: 10 }, { seconds: 20 }] };
  const values = initialClocks(definition, props, 1000);
  const get = (part: string) => values[part];
  const apply = (address: string, action: string, now: number) =>
    Object.assign(values, clockChanges(definition, props, get, address, { address, action }, now));
  const rowsAt = (now: number) => projectClocks(definition, props, get, now).rows;
  apply("r1/begin", "start", 1000);
  apply("r1/more", "press", 3900);
  expect(rowsAt(3999)).toEqual([
    { seconds: 10, remaining: 68, running: true },
    { seconds: 20, remaining: 20, running: false },
  ]);
  expect(rowsAt(4000)).toMatchObject([{ remaining: 67 }, { remaining: 20 }]);
  apply("r1/end", "stop", 4000);
  apply("r1/more", "press", 9000);
  expect(rowsAt(11000)).toMatchObject([{ remaining: 100 }, { remaining: 20 }]);
  apply("r1/reset", "press", 11000);
  expect(rowsAt(13000)).toMatchObject([{ remaining: 10 }, { remaining: 20 }]);
  apply("r1/begin", "start", 13000);
  expect(rowsAt(24000)).toMatchObject([{ remaining: 0, finished: true, running: false }, { remaining: 20 }]);
  apply("r1/more", "press", 24000);
  expect(rowsAt(26000)).toEqual([
    { seconds: 10, remaining: 60, running: false },
    { seconds: 20, remaining: 20, running: false },
  ]);
  expect(get("r1/$clock")).toMatchObject({ running: false });
});

it("stops at zero when a signed adjustment removes the last seconds", () => {
  const definition: Meta = {
    ...meta,
    adjust: { "less.press": { prop: "remaining", delta: -60 } },
  };
  const props = { seconds: 10 };
  const values = initialClocks(definition, props, 1000);
  const get = (part: string) => values[part];
  Object.assign(
    values,
    clockChanges(definition, props, get, "begin", { address: "begin", action: "start" }, 1000),
  );
  expect(
    clockChanges(definition, props, get, "less", { address: "less", action: "press" }, 2000),
  ).toMatchObject({ $remaining: 0, $state: "success", $clock: { running: false } });
});

it("shares bounded fractional steps between taps and agent actions on component and derived items", () => {
  const { clocks: _clocks, ...base } = meta;
  const adjust = {
    "plus.increment": { prop: "temp", delta: 0.5, min: 5, max: 30 },
    "minus.decrement": { prop: "temp", delta: -0.5, min: 5, max: 30 },
  };
  const parts = { plus: ["increment"], minus: ["decrement"] } as const;
  const definition: Meta = {
    ...base,
    parts: ["plus", "minus"],
    adjust,
    items: { key: "rows", parts: ["plus", "minus"], adjust },
    actions: { parts, items: parts },
    read: (input) => (input as { rows: { temp: number }[] }).rows.map(({ temp }) => `${temp}`),
  };
  const spec = { temp: 5.25, seeds: [21, 29.75] };
  const props = z
    .strictObject({ temp: z.number().min(5).max(30), seeds: z.array(z.number()) })
    .overwrite((input) => ({ ...input, rows: input.seeds.map((temp) => ({ temp })) }));
  const runtime = createScreenController({
    screen: { id: "home", components: [{ id: "c1", c: definition.id, ...spec }] },
    defs: {
      [definition.id]: { meta: definition, props, fallback: () => spec, examples: [spec], probes: [] },
    },
  });
  try {
    expect(runtime.press("c1/minus")).toMatchObject({ ok: true, changed: "c1/minus decrement = 5" });
    expect(runtime.snapshotScreen().components[0]).toMatchObject({ ...spec, temp: 5 });
    expect(runtime.actionsAt("c1/minus")).toEqual([]);
    expect(runtime.press("c1/r2/plus")).toMatchObject({ ok: true, changed: "c1/r2/plus increment = 30" });
    expect(runtime.actionsAt("c1/r2/plus")).toEqual([]);
    expect(runtime.read()).toContain("21 — 30");
    expect(runtime.act({ address: "c1/r2/minus", action: "decrement" }, { agent: true })).toMatchObject({
      ok: true,
      changed: "c1/r2/minus decrement = 29.5",
    });
    expect(runtime.read()).toContain("21 — 29.5");
    expect(runtime.snapshotScreen().components[0]).not.toHaveProperty("rows");
  } finally {
    runtime.dispose();
  }
});
