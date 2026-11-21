import { expect, it } from "vitest";
import { cameraEventRows } from "../../copy";

it("orders events by instant without mutating wire order and displays their recorded local clocks", () => {
  const events = [
    { id: "r1", kind: "person", at: "2026-11-20T12:00:00+03:00" },
    { id: "r2", kind: "motion", at: "2026-11-20T10:00:00+00:00" },
  ] as const;
  expect(cameraEventRows(events, "en")).toMatchObject([
    { id: "r2", clock: "10:00", date: "20 Nov 2026", label: "Motion" },
    { id: "r1", clock: "12:00", date: "20 Nov 2026", label: "Person" },
  ]);
  expect(events[0].id).toBe("r1");
  expect(cameraEventRows(events, "de-DE")[0]?.date).not.toBe("20 Nov 2026");
});
