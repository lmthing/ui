import { describe, expect, it } from "vitest";
import type { CastLike } from "../types";
import { emptyLine } from "../copy";
import { clip, detailOf, itemsOf, titleOf } from "./items";

const cast: CastLike = {
  things: [{ type: "walk", fields: ["label", "when"] }],
  items: [
    { id: "w1", type: "walk", sample: true, when: "09:00", label: "Morning loop" },
    { id: "w2", type: "walk", sample: true, label: "River" },
    { id: "d1", type: "dog", sample: true, name: "Clover" },
  ],
};

describe("cast helpers", () => {
  it("takes items of the first thing's type", () => {
    expect(itemsOf(cast, 5).map((item) => item.id)).toEqual(["w1", "w2"]);
    expect(itemsOf(cast, 1)).toHaveLength(1);
    expect(itemsOf({ things: [], items: [] }, 3)).toEqual([]);
  });
  it("reads texts in the thing's declared field order", () => {
    const [first] = itemsOf(cast, 1);
    expect(titleOf(first!, 28, cast.things[0])).toBe("Morning loop");
    expect(detailOf(first!, 36, cast.things[0])).toBe("09:00");
  });
  it("falls back to the item's own keys when the thing is unknown", () => {
    expect(titleOf(cast.items[2]!, 28)).toBe("Clover");
  });
  it("clips on a word boundary", () => {
    expect(clip("Riverside afternoon walk", 12)).toBe("Riverside");
    expect(clip("short", 12)).toBe("short");
  });
  it("writes empty lines without domain words of its own", () => {
    expect(emptyLine()).toBe("Nothing here yet");
    expect(emptyLine("plant")).toBe("No plants yet");
    expect(emptyLine("dog_walk")).toBe("No dog walks yet");
    expect(emptyLine("class")).toBe("No classes yet");
    expect(emptyLine("entry")).toBe("No entries yet");
  });
});
