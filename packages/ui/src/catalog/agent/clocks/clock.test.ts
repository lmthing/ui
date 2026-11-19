import { expect, it } from "vitest";
import { clockAdjustment, clockTargets, clockTime, projectClocks, clockActionValid } from "./clock";
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
      clocks: [
        {
          id: "countdown",
          kind: "down",
          from: "seconds",
          prop: "remaining",
          max: 100,
          when: { enabled: true },
          adjust: { part: "more", action: "press", delta: 60, max: 90 },
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
  const clock = clockTargets(definition, props).find(({ row }) => row === 0)!;
  expect(clockAdjustment(clock, "r1/more", "press", 30)).toBe(90);
  expect(clockAdjustment(clock, "r1/more", "press", 95)).toBeUndefined();
  expect(clockAdjustment(clock, "r1/more", "stop", 30)).toBeUndefined();
  expect(clockActionValid(definition, props, "r1/more", "press", get, 999)).toBe(false);
  expect(clockActionValid(definition, props, "r1/more", "press", get, 1000)).toBe(true);
  expect(clockActionValid(definition, props, "r2/more", "press", get, 1000)).toBe(false);
  expect(clockActionValid(definition, props, "r3/more", "press", get, 1000)).toBe(false);
});
