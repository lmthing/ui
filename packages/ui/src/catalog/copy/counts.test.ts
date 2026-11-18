import { expect, it } from "vitest";
import {
  badgeLine,
  goalLine,
  moreLine,
  percentLine,
  reviewCountLine,
  reviewLabels,
  reviewReading,
  reviewStarsLine,
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

it("keeps all trend directions, including empty and single-point data", () => {
  expect([trendWord([]), trendWord([2]), trendWord([1, 2]), trendWord([2, 1])]).toEqual([
    "steady",
    "steady",
    "rising",
    "falling",
  ]);
});

it("reads exact summary numbers and singular/plural breakdown labels", () => {
  expect([reviewCountLine(0), reviewCountLine(1), reviewCountLine(2)]).toEqual([
    "0 reviews",
    "1 review",
    "2 reviews",
  ]);
  expect([reviewStarsLine(1), reviewStarsLine(5)]).toEqual(["1 star", "5 stars"]);
  expect(
    reviewReading({
      style: "summary",
      average: 4.5,
      count: 4,
      bars: [0, 0, 0, 2, 2],
      reviews: [],
    }),
  ).toEqual(["4.5 of 5", "4 reviews", "1 star 0", "2 stars 0", "3 stars 0", "4 stars 2", "5 stars 2"]);
});

it("reads dates, ratings and reply controls with optional authored responses", () => {
  expect(
    reviewReading({
      style: "list",
      reviews: [
        { stars: 5, date: "2026-11-18", reply: 'Thank you, "Alex".' },
        { stars: 1, date: "2026-11-17" },
      ],
    }),
  ).toEqual([
    "5 of 5",
    "2026-11-18",
    reviewLabels.reply,
    reviewLabels.response,
    "1 of 5",
    "2026-11-17",
    reviewLabels.reply,
  ]);
});
