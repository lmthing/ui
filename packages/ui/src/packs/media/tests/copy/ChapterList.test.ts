import { expect, it } from "vitest";
import { chapterReading } from "../../copy";

it("reads chapter times in order and marks only the supplied current chapter", () => {
  const chapters = [
    { title: "First", at: 0 },
    { title: "Second", at: 36000 },
  ];
  expect(chapterReading({ chapters }, "en")).toEqual(["0:00 First", "10:00:00 Second"]);
  expect(chapterReading({ chapters, current: 0 }, "en")).toEqual([
    "0:00 First · Current chapter",
    "10:00:00 Second",
  ]);
  expect(chapterReading({ chapters, current: 1 }, "ar-EG")).toEqual([
    "٠:٠٠ First",
    "١٠:٠٠:٠٠ Second · Current chapter",
  ]);
});
