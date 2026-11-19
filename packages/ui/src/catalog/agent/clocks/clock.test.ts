import { expect, it } from "vitest";
import { clockTargets, clockTime, projectClocks, clockActionValid } from "./clock";
import { adjustmentAt, projectAdjustments } from "./adjustment";
import type { Meta } from "../../meta";
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
      kind: "up",
      from: "seconds",
      prop: "elapsed",
      max: 20,
      start: { part: "begin", action: "start" },
      stop: { part: "end", action: "stop" },
    },
  ],
};
it("uses fake timestamps, rounds whole seconds and clamps backwards time and the cap", () => {
  const clock = clockTargets(meta, { seconds: 10 })[0]!;
  const state = { running: true, from: 1000, seconds: 10 };
  expect(clockTime(clock, state, undefined, 3999)).toBe(12);
  expect(clockTime(clock, state, undefined, 0)).toBe(10);
  expect(clockTime(clock, state, undefined, 100000)).toBe(20);
  expect(clockTime(clock, { ...state, running: false }, 13, 100000)).toBe(13);
});
it("projects the declared prop and offers only the valid running control", () => {
  const get = (part: string) => (part === "$clock" ? { running: true, from: 1000, seconds: 10 } : undefined);
  expect(projectClocks(meta, { seconds: 10 }, get, 4000)).toEqual({ seconds: 10, elapsed: 13 });
  expect(clockActionValid(meta, { seconds: 10 }, "begin", "start", get, 4000)).toBe(false);
  expect(clockActionValid(meta, { seconds: 10 }, "end", "stop", get, 4000)).toBe(true);
});
it("only offers changing adjustments on their owning item, respecting the live cap", () => {
  const definition: Meta = {
    ...meta,
    items: {
      key: "rows",
      parts: ["more"],
      adjust: { "more.press": { prop: "remaining", delta: 60, max: 90 } },
      clocks: [
        {
          id: "countdown",
          kind: "down",
          from: "seconds",
          prop: "remaining",
          max: 100,
          when: { enabled: true },
        },
      ],
    },
  };
  const props = {
    rows: [
      { seconds: 90, enabled: true },
      { seconds: 10, enabled: false },
    ],
  };
  const state = { running: true, from: 0, seconds: 90 };
  const get = (key: string) => (key === "r1/$countdown" ? state : undefined);
  expect(adjustmentAt(definition, props, "r1/more", "press", get, 999)?.next).toBeUndefined();
  expect(adjustmentAt(definition, props, "r1/more", "press", get, 1000)).toMatchObject({
    current: 89,
    next: 90,
  });
  expect(adjustmentAt(definition, props, "r2/more", "press", get, 1000)?.next).toBeUndefined();
  expect(adjustmentAt(definition, props, "r3/more", "press", get, 1000)).toBeUndefined();
  expect(adjustmentAt(definition, props, "r1/more", "stop", get, 1000)).toBeUndefined();
});

it("projects only addressed numeric rows and preserves order and base props", () => {
  const plus = { prop: "value", delta: 0.5, min: 5, max: 30 };
  const definition: Meta = {
    ...meta,
    adjust: { "plus.increment": plus },
    items: { key: "rows", parts: ["plus"], adjust: { "plus.increment": plus } },
  };
  const props = { value: 29.75, rows: [{ id: "r1", value: 21 }, { id: "r2", value: 19 }, { id: "r3" }] };
  const get = (key: string) => (key === "r2/$adjust/value" ? 19.5 : undefined);
  expect(adjustmentAt(definition, props, "plus", "increment", get, 0)?.next).toBe(30);
  expect(adjustmentAt(definition, props, "r2/plus", "increment", get, 0)?.next).toBe(20);
  expect(adjustmentAt(definition, props, "r3/plus", "increment", get, 0)?.next).toBeUndefined();
  expect(projectAdjustments(definition, props, get).rows).toEqual([
    { id: "r1", value: 21 },
    { id: "r2", value: 19.5 },
    { id: "r3" },
  ]);
  expect(props.rows[1]?.value).toBe(19);
});
