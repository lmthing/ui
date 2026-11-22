import { expect, it } from "vitest";
import { availabilityDayLabel, availabilityDefaults, availabilityLabels, breakLine } from "../../copy";

it("keeps working-week defaults and labels neutral", () => {
  expect(availabilityDefaults).toEqual({ from: "09:00", to: "17:00" });
  expect(availabilityLabels).toMatchObject({ from: "From", to: "To", break: "Break" });
  expect(availabilityDayLabel("mon", false)).toBe("Monday · Off");
  expect(availabilityDayLabel("mon", true)).toBe("Monday");
  expect(breakLine("00:00", "23:59")).toBe("Break 00:00–23:59");
});
