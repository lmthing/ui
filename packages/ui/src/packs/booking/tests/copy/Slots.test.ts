import { expect, it } from "vitest";
import { slotEndLine, slotLabelLine, slotLabels } from "../../copy";

it("formats local end times at the supported boundaries", () => {
  expect([
    slotEndLine("00:00", 5),
    slotEndLine("09:30", 30),
    slotEndLine("14:00", 60),
    slotEndLine("23:55", 5),
    slotEndLine("23:59", 600),
  ]).toEqual(["→ 00:05", "→ 10:00", "→ 15:00", "→ 00:00 next day", "→ 09:59 next day"]);
  expect(slotLabels).toEqual({ free: "free", taken: "taken", empty: "No free times" });
});

it("shares the numeric line between the view and reader for each layout", () => {
  expect([
    slotLabelLine("09:00", 30, "grid"),
    slotLabelLine("09:00", 30, "rows"),
    slotLabelLine("09:00", 30, "ranges"),
    slotLabelLine("23:59", 600, "rows"),
  ]).toEqual(["09:00", "09:00 → 09:30", "09:00–09:30", "23:59 → 09:59 next day"]);
});
