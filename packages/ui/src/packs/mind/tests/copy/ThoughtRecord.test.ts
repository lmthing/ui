import { describe, expect, it } from "vitest";
import { canSaveReflection, emptyReflection, moodChange, readReflection } from "../../copy";

describe("ThoughtRecord copy", () => {
  it.each([
    [1, 5, "+4"],
    [5, 1, "-4"],
    [3, 3, "0"],
    [undefined, 3, undefined],
    [3, undefined, undefined],
  ])("computes mood change from %s to %s", (before, after, expected) => {
    expect(moodChange(before, after)).toBe(expected);
  });

  it("reads only visible ratings and only computes a delta once both exist", () => {
    expect(readReflection({ detail: "full", moodBefore: 4 }, "filled")).toContain("Mood before: 4");
    expect(readReflection({ detail: "full", moodBefore: 4 }, "filled").join()).not.toContain("Mood change");
    expect(readReflection({ detail: "brief", moodBefore: 4, moodAfter: 3 }, "filled")).toEqual([
      "Thought record",
      "What went through your mind?",
      "Thinking traps",
      "A more balanced thought",
      "Save reflection",
    ]);
  });

  it("requires a nonblank thought and reframe, not a mood rating", () => {
    expect(canSaveReflection({ thought: " A thought ", reframe: " A different view " })).toBe(true);
    expect(canSaveReflection({ thought: "A thought", reframe: " \n " })).toBe(false);
    expect(canSaveReflection({ reframe: "A different view", moodBefore: 1, moodAfter: 5 })).toBe(false);
  });

  it("retains the available traps but removes their selection for a blank form", () => {
    const options = [{ id: "r1", label: "A trap", on: true }];
    expect(emptyReflection(options)).toMatchObject({ distortions: [{ ...options[0], on: false }] });
    expect(options[0]?.on).toBe(true);
  });
});
