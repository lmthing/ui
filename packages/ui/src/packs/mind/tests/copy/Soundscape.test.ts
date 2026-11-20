import { expect, it } from "vitest";
import { mixRead, mixTimer } from "../../copy";

it("renders zero as off and forwards the locale when formatting minutes and volume", () => {
  expect(mixTimer(0, "ar-EG")).toBe("Off");
  expect(mixTimer(45, "ar-EG")).toBe("٤٥ min");
  expect(mixRead([{ label: "Wind", level: 2 }], 20, true, "ar-EG")).toEqual([
    "Sleep timer",
    "٢٠ min",
    "Pause mix",
    '"Wind": ٢',
  ]);
});
