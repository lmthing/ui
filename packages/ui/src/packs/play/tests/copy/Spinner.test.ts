import { expect, it } from "vitest";
import { spinnerLines } from "../../copy";

const options = [{ label: "One" }, { label: "Two" }, { label: "Three" }];

it("does not name a result before a draw and omits reset when draws can repeat", () => {
  expect(spinnerLines(options, true)).toEqual({
    status: "Ready to spin",
    selected: undefined,
    spin: "Spin",
    reset: undefined,
    exhausted: false,
  });
});

it("reads the selected label and localizes the count and noun", () => {
  const draw = { kind: "pick", index: 0, used: [0], remaining: 2 } as const;
  expect(spinnerLines(options, false, draw, "en-u-nu-arab")).toMatchObject({
    status: "٢ options left",
    selected: "One",
    spin: "Spin again",
    reset: "Reset options",
  });
  expect(spinnerLines(options, false, { ...draw, remaining: 1 }).status).toBe("1 option left");
  expect(spinnerLines(options, false, { ...draw, remaining: 0 })).toMatchObject({
    status: "No options left",
    selected: "One",
    exhausted: true,
  });
});
