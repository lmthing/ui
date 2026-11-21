import { describe, expect, it } from "vitest";
import { shiftDetails, shiftReading, shiftSchedule } from "../../copy";

const input = {
  date: "2026-11-16",
  from: "07:00",
  to: "12:00",
  role: "Opening",
  place: "Main site",
  with: "Rae",
  status: "offered",
} as const;

describe("Shift copy", () => {
  it("formats both stored times and the date in the requested locale", () => {
    expect(shiftSchedule(input)).toEqual({
      date: "16 Nov 2026",
      from: "07:00",
      to: "12:00",
      range: "07:00–12:00",
    });
    expect(shiftSchedule(input, "ar-EG")).toMatchObject({
      from: "٠٧:٠٠",
      to: "١٢:٠٠",
      range: "٠٧:٠٠–١٢:٠٠",
    });
    expect(shiftSchedule(input, "ar-EG").date).not.toBe("16 Nov 2026");
  });
  it("orders optional detail and uses the same localized copy in the reading", () => {
    expect(shiftDetails(input)).toEqual([
      { part: "role", prefix: "", text: "Opening" },
      { part: "place", prefix: "", text: "Main site" },
      { part: "with", prefix: "With ", text: "Rae" },
    ]);
    expect(shiftDetails({})).toEqual([]);
    expect(shiftReading({ ...input, detail: "brief" })).toEqual([
      "07:00–12:00",
      "16 Nov 2026",
      "Offered",
      '"Opening"',
      "Ask to swap",
      "Offer sent",
    ]);
  });
});
