import { expect, it } from "vitest";
import { slotDetailLine, slotEndLine, slotLabels, slotLoadingLine } from "../../copy";

it("formats local end times at the supported boundaries", () => {
  expect([
    slotEndLine("00:00", 5),
    slotEndLine("09:30", 30),
    slotEndLine("14:00", 60),
    slotEndLine("23:55", 5),
    slotEndLine("23:59", 600),
  ]).toEqual(["→ 00:05", "→ 10:00", "→ 15:00", "→ 00:00 +1d", "→ 09:59 +1d"]);
  expect(slotLabels).toEqual({ free: "free", taken: "taken", empty: "No free times" });
});

it("shares visible slot subtitles and geometry-only loading text with the reading", () => {
  expect([
    slotDetailLine("09:00", 30, "grid", false),
    slotDetailLine("09:00", 30, "grid", true),
    slotDetailLine("09:00", 30, "list", false),
    slotDetailLine("23:59", 600, "list", true),
  ]).toEqual(["free", "taken", "→ 09:30", "→ 09:59 +1d · taken"]);
  for (const line of ["", "09:00", "free", "→ 09:59 +1d · taken"]) {
    expect(slotLoadingLine(line)).toHaveLength(line.length);
    expect(slotLoadingLine(line).trim()).toBe("");
  }
});
