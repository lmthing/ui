import { expect, it } from "vitest";
import { orderedViewings, viewingTimes } from "../../copy";

it("sorts by instant without changing input rows or their ids", () => {
  const first = { id: "r1", start: "2026-10-17T12:00:00-02:00" };
  const second = { id: "r2", start: "2026-10-17T14:00:00+02:00" };
  const rows = [first, second];
  expect(orderedViewings(rows)).toEqual([second, first]);
  expect(rows).toEqual([first, second]);
});

it("keeps the appointment's local clock while computing the end instant", () => {
  expect(viewingTimes("2026-10-17T23:40:45.250-04:30", 30)).toEqual({
    startLabel: "17 Oct 2026 · 23:40",
    endLabel: "Ends 18 Oct 2026 00:10 · 30 min",
    end: "2026-10-18T04:40:45.250Z",
  });
});

it("formats dates, clocks and duration with the app locale", () => {
  const english = viewingTimes("2026-10-17T13:40:00Z", 30);
  const locale = viewingTimes("2026-10-17T13:40:00Z", 30, "ar-EG");
  expect(english.endLabel).toBe("Ends 14:10 · 30 min");
  expect(locale.end).toBe(english.end);
  expect(locale.startLabel).toContain("١٣:٤٠");
  expect(locale.endLabel).toContain("٣٠");
});
