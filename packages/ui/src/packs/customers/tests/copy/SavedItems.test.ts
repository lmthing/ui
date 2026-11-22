import { expect, it } from "vitest";
import { savedItemDetails, savedItemGroups } from "../../copy";

it("formats rates with the host currency and locale, without inventing units", () => {
  expect(savedItemDetails({ rate: 32.5, unit: "visit", taxable: true }, "en-GB", "GBP")).toEqual({
    amount: "£32.50",
    unit: " / visit",
    tax: "Taxable",
  });
  expect(savedItemDetails({ rate: 0, taxable: false }, "en-GB", "GBP")).toEqual({
    amount: "£0",
    unit: "",
    tax: "Not taxable",
  });
});

it("groups without renumbering items, including an uncategorized group", () => {
  const items = [
    { id: "r1", category: "Visits" },
    { id: "r2", category: "Supplies" },
    { id: "r3" },
    { id: "r4", category: "Visits" },
  ];
  expect(savedItemGroups(items)).toEqual([
    { category: "Visits", rows: [items[0], items[3]] },
    { category: "Supplies", rows: [items[1]] },
    { category: undefined, rows: [items[2]] },
  ]);
  expect(items.map(({ id }) => id)).toEqual(["r1", "r2", "r3", "r4"]);
});
