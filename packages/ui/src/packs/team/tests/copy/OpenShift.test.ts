import { describe, expect, it } from "vitest";
import { openShiftLines, openShiftReading } from "../../copy";

const schedule = { date: "2026-11-21", from: "07:00", to: "11:00" };

describe("OpenShift copy", () => {
  it("formats date, times and pay in the requested locale, including zero", () => {
    expect(openShiftLines({ ...schedule, pay: 0 }, "full")).toMatchObject({
      date: "21 Nov 2026",
      from: "07:00",
      to: "11:00",
      pay: "$0",
    });
    expect(openShiftLines({ ...schedule, pay: 64.5 }, "full", "ar-EG")).toMatchObject({
      from: "٠٧:٠٠",
      to: "١١:٠٠",
      range: "٠٧:٠٠–١١:٠٠",
      pay: expect.stringContaining("٦٤٫٥٠"),
    });
    expect(openShiftLines({ ...schedule, pay: Number.MAX_VALUE }, "full").pay).toBe("$1.8E308");
  });
  it("includes pay only when supplied and visible, leaving claim row IDs intact", () => {
    const shifts = [{ ...schedule, pay: 64.5 }, schedule];
    expect(openShiftReading({ shifts })).toEqual([
      "r1 21 Nov 2026 07:00–11:00 · $64.50",
      "r2 21 Nov 2026 07:00–11:00",
      "Claim",
    ]);
    expect(openShiftReading({ shifts, detail: "brief" })).toEqual([
      "r1 21 Nov 2026 07:00–11:00",
      "r2 21 Nov 2026 07:00–11:00",
      "Claim",
    ]);
  });
});
