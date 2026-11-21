import { expect, it } from "vitest";
import { routineLastRun, routineOrder, routineTriggerParts } from "../../copy";

it("keeps stored local run times and puts never-run entries after actual runs", () => {
  const past = { lastRun: "2026-11-20T12:00:00+03:00", id: "r1" };
  const recent = { lastRun: "2026-11-20T10:00:00Z", id: "r3" };
  const never = { lastRun: undefined, id: "r2" };
  const rows = [past, never, recent];
  expect(routineOrder(rows, "rules")).toEqual(rows);
  expect(routineOrder(rows, "activity")).toEqual([recent, past, never]);
  expect(routineLastRun(past.lastRun, "en")).toBe("Last run: 20 Nov 2026 · 12:00");
  expect(routineLastRun(past.lastRun, "de-DE")).not.toBe("Last run: 20 Nov 2026 · 12:00");
  expect(routineLastRun(undefined)).toBe("Not run yet");
});

it("highlights clocks and thresholds without changing the supplied text", () => {
  const label = "At 07:00 if humidity reaches 70%";
  expect(routineTriggerParts(label)).toEqual(["At ", "07:00", " if humidity reaches ", "70%", ""]);
  expect(routineTriggerParts(label).join("")).toBe(label);
  expect(routineTriggerParts("At sunset")).toEqual(["At sunset"]);
});
