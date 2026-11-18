import { expect, it } from "vitest";
import { reviewCountLine, reviewLabels, reviewReading, reviewScaleLabels, reviewStarsLine } from "../../copy";

it("reads exact summary numbers and singular/plural breakdown labels", () => {
  expect([reviewCountLine(0), reviewCountLine(1), reviewCountLine(2)]).toEqual([
    "0 reviews",
    "1 review",
    "2 reviews",
  ]);
  expect([reviewStarsLine(1), reviewStarsLine(5)]).toEqual(["1 star", "5 stars"]);
  expect(reviewScaleLabels).toEqual(["1 of 5", "2 of 5", "3 of 5", "4 of 5", "5 of 5"]);
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
