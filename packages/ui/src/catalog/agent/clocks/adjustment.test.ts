import { expect, it } from "vitest";
import { adjustmentAt, projectAdjustments } from "./adjustment";
import { itemSetAt } from "./numeric";
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
it("resolves item sets and adjustments to the same key and inherits bounds with a custom prefix", () => {
  const definition: Meta = {
    ...meta,
    items: {
      key: "rows",
      prefix: "o",
      parts: ["value", "plus"],
      set: { value: { prop: "amount", max: 30 } },
      adjust: { "plus.increment": { prop: "amount", delta: 0.5 } },
    },
  };
  const props = { rows: [{ amount: 21 }] };
  const set = itemSetAt(definition, props, "o1/value");
  expect(set).toMatchObject({ key: "o1/$adjust/amount", spec: { max: 30 } });
  expect(itemSetAt(definition, props, "o2/value")).toBeUndefined();
  expect(itemSetAt(definition, props, "o1/child/value")).toBeUndefined();
  const get = (part: string) => (part === set?.key ? 29.75 : undefined);
  expect(adjustmentAt(definition, props, "o1/plus", "increment", get, 0)).toMatchObject({
    key: set?.key,
    current: 29.75,
    next: 30,
  });
  expect(projectAdjustments(definition, props, get).rows).toEqual([{ amount: 29.75 }]);
});

it("uses stamped ordinals for wire setters without replacing authored ids", () => {
  const definition: Meta = {
    ...meta,
    items: { key: "rows", parts: ["value"], set: { value: { prop: "amount" } } },
  };
  const wire = {
    rows: [
      { id: "r2", amount: 10 },
      { id: "r1", amount: 20 },
    ],
  };
  const get = (part: string) => (part === "r1/$adjust/amount" ? 15 : undefined);
  expect(projectAdjustments(definition, wire, get, true).rows).toEqual([
    { id: "r2", amount: 15 },
    { id: "r1", amount: 20 },
  ]);
});
