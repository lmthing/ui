import { describe, expect, it } from "vitest";
import { storiesReading } from "../../copy";

const people = [
  { name: "Maya", seen: false },
  { name: "Sam", seen: true },
];

describe("Stories reading", () => {
  it("reads the add caption and distinguishes seen from unseen in input order", () => {
    expect(storiesReading({ mine: true, detail: "full", people }, "filled")).toEqual([
      "Add your story",
      "Your story",
      "Maya: new story",
      "Sam: seen story",
    ]);
  });
  it("does not read hidden captions or expose stories from an empty rail", () => {
    expect(storiesReading({ mine: true, detail: "brief", people }, "filled", "en-GB")).toEqual([
      "Add your story",
      "Maya: new story",
      "Sam: seen story",
    ]);
    expect(storiesReading({ mine: false, detail: "full", people }, "filled")).toEqual([
      "Maya: new story",
      "Sam: seen story",
    ]);
    expect(storiesReading({ mine: true, detail: "full", people }, "empty")).toEqual([]);
  });
});
