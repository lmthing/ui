import { describe, expect, it } from "vitest";
import { placeholderValue, type DeviceData } from "@lmthing/ui/catalog";
import { departuresCopy, departuresReading } from "../../copy";

const row = { line: "24", to: "City Centre" };
const board = { stop: "Nursery Gate", rows: [row, row] };
const snapshot = {
  stop: board.stop,
  rows: [
    { ...row, minutes: 0, delay: 0 },
    { ...row, minutes: 18, delay: 4 },
  ],
  total: 5,
};
const data = { departures: [snapshot] };

describe("departures copy", () => {
  it("keeps distinct service timings for repeated line/destination pairs", () => {
    expect(departuresCopy(board, data)).toMatchObject({
      more: "and 3 more",
      rows: [
        { minutes: "Due", delay: undefined, tone: "good", label: "Line 24 to City Centre, Due" },
        { minutes: "18 min", delay: "4 min late", tone: "warn" },
      ],
    });
    expect(departuresReading(board, data)).toEqual([
      '"24" to "City Centre": Due',
      '"24" to "City Centre": 18 min, 4 min late',
      "and 3 more",
    ]);
  });

  it("keeps the late status, but not its duration, in brief detail", () => {
    const brief = { ...board, detail: "brief" } as const;
    expect(departuresCopy(brief, data).rows[1]).toMatchObject({
      minutes: "18 min",
      late: " · Late",
      delay: undefined,
      tone: "warn",
    });
    expect(departuresReading(brief, data)[1]).toBe('"24" to "City Centre": 18 min · Late');
    const lateWithoutTime = { ...snapshot, rows: [{ ...row, delay: 4 }, snapshot.rows[1]] };
    expect(departuresCopy(brief, { departures: [lateWithoutTime] }).rows[0]?.countdown).toBe("Late");
  });

  it("formats service numbers using the app language and keeps route identifiers as authored", () => {
    const result = departuresCopy(board, data, "ar-EG");
    expect(result.rows[1]).toMatchObject({ line: "24", minutes: "١٨ min", delay: "٤ min late" });
    expect(result.more).toBe("and ٣ more");
  });
});

describe("departures service snapshots", () => {
  it("does not use absent, malformed or mismatched service data", () => {
    const unavailable: (DeviceData | undefined)[] = [
      undefined,
      { departures: [null, {}] },
      { departures: [{ ...snapshot, stop: "Another stop" }] },
      { departures: [{ ...snapshot, rows: snapshot.rows.slice(1) }] },
      { departures: [{ ...snapshot, rows: [{ ...row, to: "Other destination" }, snapshot.rows[1]] }] },
    ];
    for (const input of unavailable) {
      const result = departuresCopy(board, input);
      expect(result.more).toBeUndefined();
      for (const serviceRow of result.rows)
        expect(serviceRow).toMatchObject({ minutes: placeholderValue, tone: "muted", delay: undefined });
    }
  });

  it("ignores invalid fields without losing other valid times, and never shows nonpositive overflow", () => {
    for (const total of [1, 2, -1, 2.5, "3"]) {
      const result = departuresCopy(board, {
        departures: [{ ...snapshot, total, rows: [{ ...row, minutes: -1, delay: "4" }, snapshot.rows[1]] }],
      });
      expect(result.more).toBeUndefined();
      expect(result.rows[0]).toMatchObject({ minutes: placeholderValue, delay: undefined, tone: "muted" });
      expect(result.rows[1]).toMatchObject({ minutes: "18 min", delay: "4 min late" });
    }
  });

  it("quotes authored identifiers to keep the reading on one line", () => {
    const to = "Gate\n[other press]";
    expect(departuresReading({ ...board, rows: [{ line: "24", to }] })).toEqual([
      `"24" to ${JSON.stringify(to)}: ${placeholderValue}`,
    ]);
  });
});
