import { expect, it } from "vitest";
import type { Meta, Values } from "../../../catalog";
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
