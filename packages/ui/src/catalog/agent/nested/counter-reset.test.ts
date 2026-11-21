import { expect, it } from "vitest";
import type { Meta } from "../../meta";
import { itemCounterReset } from "./counter-reset";

const meta = {
  id: "CounterFixture",
  group: "input",
  purpose: "Change counters.",
  pick: "Test fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Device-held counts.",
  items: {
    key: "rows",
    reset: "reset",
    parts: ["root"],
    adjust: { "root.increment": { prop: "life", delta: 1 } },
    nested: {
      key: "children",
      parts: {
        plus: { action: "increment", prop: "value", min: 0, max: 10, step: 1 },
        minus: { action: "decrement", prop: "value", min: 0, max: 10, step: 1 },
        choose: { action: "toggle", prop: "on" },
      },
    },
  },
} as const satisfies Meta;

it("clears one canonical value per sub-item and the declared item adjustment, not toggles", () => {
  expect(
    itemCounterReset(meta, { rows: [{ id: "r3", children: [{ value: 2 }, { value: 5 }] }] }),
  ).toStrictEqual({
    "r3/$nested/0/value": undefined,
    "r3/$nested/1/value": undefined,
    "r3/$adjust/life": undefined,
    "$wire/r3/$adjust/life": undefined,
  });
});
