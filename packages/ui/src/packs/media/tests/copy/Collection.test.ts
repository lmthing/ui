import { expect, it } from "vitest";
import { collectionReading, collectionSummary } from "../../copy";

it("uses the count, kind and sum of the recording lengths", () => {
  expect(collectionSummary({ style: "episodes", items: [{ seconds: 2400 }, { seconds: 1200 }] }, "en")).toBe(
    "2 episodes · 1 h",
  );
  expect(collectionSummary({ items: [{ seconds: 3660, played: 0.9 }] }, "en")).toBe("1 track · 1 h 1 min");
  expect(collectionSummary({ style: "episodes", items: [{ seconds: 1 }] }, "en")).toBe("1 episode · 1 sec");
});

it("uses the language for count and duration digits", () => {
  expect(collectionSummary({ items: [{ seconds: 30 }, { seconds: 30 }] }, "ar-EG")).toBe("٢ tracks · ١ min");
});

it.each([
  undefined,
  {},
  { items: [] },
  { items: [null] },
  { items: [{ seconds: -1 }] },
  { items: [{ seconds: Infinity }] },
  { state: "loading", items: [{ seconds: 60 }] },
])("does not invent totals for absent or invalid data", (input) => {
  expect(collectionSummary(input, "en")).toBeUndefined();
  expect(collectionReading(input, false, "en")).toEqual(["Play all", "Follow"]);
});

it("reads the summary and the seeded follow label", () => {
  expect(collectionReading({ items: [{ seconds: 600 }] }, true, "en")).toEqual([
    "1 track · 10 min",
    "Play all",
    "Following",
  ]);
});
