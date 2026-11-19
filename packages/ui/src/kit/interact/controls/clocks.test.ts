import { expect, it } from "vitest";
import { projectClocks, type Meta, type Values } from "../../../catalog";
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
      clocks: [
        {
          ...meta.clocks![0]!,
          max: 100,
          zero: { prop: "finished", value: true },
          adjust: { part: "more", action: "press", delta: 60 },
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
    { seconds: 10, remaining: 68 },
    { seconds: 20, remaining: 20 },
  ]);
  expect(rowsAt(4000)).toMatchObject([{ remaining: 67 }, { remaining: 20 }]);
  apply("r1/end", "stop", 4000);
  apply("r1/more", "press", 9000);
  expect(rowsAt(11000)).toMatchObject([{ remaining: 100 }, { remaining: 20 }]);
  apply("r1/reset", "press", 11000);
  expect(rowsAt(13000)).toMatchObject([{ remaining: 10 }, { remaining: 20 }]);
  apply("r1/begin", "start", 13000);
  expect(rowsAt(24000)).toMatchObject([{ remaining: 0, finished: true }, { remaining: 20 }]);
  apply("r1/more", "press", 24000);
  expect(rowsAt(26000)).toEqual([
    { seconds: 10, remaining: 60 },
    { seconds: 20, remaining: 20 },
  ]);
  expect(get("r1/$clock")).toMatchObject({ running: false });
});

it("stops at zero when a signed adjustment removes the last seconds", () => {
  const definition: Meta = {
    ...meta,
    clocks: [{ ...meta.clocks![0]!, adjust: { part: "less", action: "press", delta: -60 } }],
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
