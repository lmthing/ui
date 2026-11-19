import { expect, it } from "vitest";
import { availabilityDefaults, availabilityLabels, breakLine } from "../../copy";

it("keeps working-week defaults and labels neutral", () => {
  expect(availabilityDefaults).toEqual({ from: "09:00", to: "17:00" });
  expect(availabilityLabels).toEqual({ from: "From", to: "To", break: "Break" });
  expect(breakLine("00:00", "23:59")).toBe("Break 00:00–23:59");
});
