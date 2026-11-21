import { describe, expect, it } from "vitest";
import { boardReading, boardStages } from "../../copy";

const columns = [{ label: "New" }, { label: "Booked" }, { label: "Closed" }];
const cards = [
  { title: "First", column: 1, value: 12, tag: "Weekly", who: "Sam" },
  { title: "Second", column: 1, value: -12 },
  { title: "Third", column: 0 },
];

describe("Board copy", () => {
  it("counts by stage, distinguishes zero totals from missing values, and formats in the app currency", () => {
    expect(boardStages(columns, cards, "en-GB", "GBP")).toEqual([
      { label: "New", count: "1", total: undefined },
      { label: "Booked", count: "2", total: "£0" },
      { label: "Closed", count: "0", total: undefined },
    ]);
    expect(boardStages(columns, cards, "ar-EG", "GBP")[1]?.count).toBe("٢");
  });

  it("reads both stage summaries and cards in stable address order", () => {
    expect(boardReading({ columns, cards }, "en-GB", "GBP")).toEqual([
      "New (1) · Booked (2, Total £0) · Closed (0)",
      "Move to",
      "r1: Booked · First · Weekly · Sam · £12",
      "r2: Booked · Second · -£12",
      "r3: New · Third",
    ]);
  });
});
