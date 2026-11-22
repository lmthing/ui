import { components } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { activeBag, bagReading, bagView } from "../../copy";

const { bags } = components.BagTracker.examples[0]!;
const [arrived, waiting] = bags as [(typeof bags)[number], (typeof bags)[number]];

it("derives latest scan and next milestone from completed rows, not the last supplied row", () => {
  expect(activeBag(bags)).toBe(arrived);
  expect(activeBag([arrived, { ...waiting, active: true }]).tag).toBe(waiting.tag);
  expect(bagView(waiting)).toMatchObject({ latest: "Latest: Loaded", next: "Next: Unloaded", trackAt: 3 });
  expect(bagView({ ...waiting, steps: [{ stage: "checked_in", done: false }] })).toMatchObject({
    latest: "No scans yet",
    next: "Next: Checked in",
    trackAt: 1,
  });
});

it("uses the last completed scan across gaps, and shows a carousel only upon arrival", () => {
  expect(bagView(arrived).carousel).toBe("Carousel 5");
  expect(bagView({ ...waiting, carousel: "5" }).carousel).toBeUndefined();
  const missing = [
    { stage: "checked_in", done: false },
    { stage: "unloaded", done: true },
  ] as const;
  expect(bagView({ ...waiting, steps: missing, carousel: "5" })).toMatchObject({
    latest: "Latest: Unloaded",
    carousel: "Carousel 5",
    scans: [{ note: "Awaiting scan" }, { done: true }],
  });
});

it("reads only the visible scan history or per-bag compact status", () => {
  const active = bagReading({ bags: [arrived, { ...waiting, active: true }] }, false).join("\n");
  expect(active).toContain("16:52");
  expect(active).not.toContain("16:50");
  const brief = bagReading({ bags, detail: "brief" }, false).join("\n");
  expect(brief).toContain("Carousel 5");
  expect(brief).toContain("Latest: Loaded");
  expect(brief).not.toMatch(/16:50|16:52/);
});
