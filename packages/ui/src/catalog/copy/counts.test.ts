import { expect, it } from "vitest";
import {
  badgeLine,
  goalLine,
  listDetailLines,
  moreLine,
  percentLine,
  stampLine,
  stepLine,
  totalLine,
  trendWord,
} from "./counts";

it("keeps count, sequence and total copy unchanged", () => {
  expect(goalLine(5)).toBe("of 5");
  expect(stepLine(2, 3)).toBe("Step 2 of 3");
  expect(totalLine(23, "walks")).toBe("Total 23 walks");
  expect(totalLine(0)).toBe("Total 0");
  expect(moreLine(3)).toBe("+3");
  expect([badgeLine(0), badgeLine(99), badgeLine(100)]).toEqual(["0", "99", "99+"]);
  expect([percentLine(5, 12), percentLine(1, 0)]).toEqual(["42%", "0%"]);
});

it("reads and addresses only the details supplied for each list row", () => {
  expect(
    listDetailLines([{ pinned: true, progress: 0 }, {}, { id: "r7", unread: true, progress: 1 }]),
  ).toEqual(["r1 Pinned · Progress: 0%", "r7 Unread · Progress: 100%"]);
});

it("reads every bounded stamp count with its target", () => {
  for (let of = 4; of <= 12; of++)
    for (let stamps = 0; stamps <= of; stamps++) expect(stampLine(stamps, of)).toBe(`${stamps} of ${of}`);
});

it("keeps all trend directions, including empty and single-point data", () => {
  expect([trendWord([]), trendWord([2]), trendWord([1, 2]), trendWord([2, 1])]).toEqual([
    "steady",
    "steady",
    "rising",
    "falling",
  ]);
});
