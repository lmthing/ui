import { expect, it } from "vitest";
import { clockTargets, clockTime, projectClocks, clockActionValid } from "./clock";
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
