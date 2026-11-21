import { expect, it } from "vitest";
import { calcKeys } from "./KitCalcPad";

it("separates the scientific keys and keeps the supplied order in both groups", () => {
  const keys = [
    { id: "r1", label: "sin", value: "sin(", role: "fn" },
    { id: "r2", label: "7", value: "7" },
    { id: "r3", label: "+", value: "+", role: "op" },
    { id: "r4", label: "√", value: "sqrt(", role: "fn", disabled: true },
    { id: "r5", label: "=", value: "=", role: "eq" },
  ] as const;
  const standard = [keys[1], keys[2], keys[4]];
  expect(calcKeys(keys, false)).toEqual({ standard, drawer: [] });
  expect(calcKeys(keys, true)).toEqual({ standard, drawer: [keys[0], keys[3]] });
});
