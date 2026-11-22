import { expect, it } from "vitest";
import { dateOrdinal, dateSpanNights } from "./date-span";

it("counts calendar nights across leap days and daylight saving boundaries", () => {
  for (const days of [
    ["2028-02-28", "2028-02-29", "2028-03-01"],
    ["2026-03-07", "2026-03-08", "2026-03-09"],
  ]) {
    const [start, , end] = days;
    const available = new Set(days.map((day) => dateOrdinal(day)!));
    expect(dateSpanNights(start, end, available, 2)).toBe(2);
    expect(dateSpanNights(start, end, available, 3)).toBeUndefined();
    expect(dateSpanNights(start, start, available)).toBeUndefined();
    expect(dateSpanNights(end, start, available)).toBeUndefined();
    available.delete(dateOrdinal(days[1])!);
    expect(dateSpanNights(start, end, available)).toBeUndefined();
  }
});

it("rejects invalid dates, incomplete endpoints, and invalid minimums", () => {
  const available = new Set([dateOrdinal("2026-02-28")!, dateOrdinal("2026-03-01")!]);
  expect(dateOrdinal("2026-02-29")).toBeUndefined();
  for (const min of [0, 1.5, 31, NaN, Infinity])
    expect(dateSpanNights("2026-02-28", "2026-03-01", available, min)).toBeUndefined();
  available.delete(dateOrdinal("2026-03-01")!);
  expect(dateSpanNights("2026-02-28", "2026-03-01", available)).toBeUndefined();
});
