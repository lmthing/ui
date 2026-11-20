import { expect, it } from "vitest";
import { entryMonth, entryMonths, entryTags } from "../../copy";

it("formats the stored month in UTC using the app locale", () => {
  expect(entryMonth("2026-01-01")).toBe("January 2026");
  expect(entryMonth("2026-11-30", "fr-FR")).toBe("novembre 2026");
});

it("groups dates by year and month without changing item order or ids", () => {
  const rows = [
    { id: "r1", date: "2026-11-30" },
    { id: "r2", date: "2026-11-01" },
    { id: "r3", date: "2025-11-30" },
  ];
  expect(entryMonths(rows)).toEqual([
    { month: "2026-11", entries: rows.slice(0, 2) },
    { month: "2025-11", entries: rows.slice(2) },
  ]);
  expect(entryMonths([])).toEqual([]);
});

it("formats authored tags without adding a label or changing their contents", () => {
  expect(entryTags(["Morning", "Friends"], "en-GB")).toBe("Morning · Friends");
  expect(entryTags([])).toBe("");
});
