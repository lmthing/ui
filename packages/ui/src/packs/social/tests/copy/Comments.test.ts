import { describe, expect, it } from "vitest";
import { commentLikeCopy, commentReading } from "../../copy";

describe("Comments copy", () => {
  it("uses locale-aware numbers and like plurals", () => {
    expect(commentLikeCopy(0, "en")).toEqual({ count: "0", line: "0 likes" });
    expect(commentLikeCopy(1, "en")).toEqual({ count: "1", line: "1 like" });
    expect(commentLikeCopy(12500, "en-u-nu-arab")).toEqual({ count: "١٢٥٠٠", line: "١٢٥٠٠ likes" });
  });

  it("names the closest top-level parent for each reply and omits seed counts when empty", () => {
    const input = {
      comments: [
        { name: "Sam", likes: 0, reply: false },
        { name: "Lee", likes: 2, reply: true },
        { name: "Maya", likes: 1, reply: true },
        { name: "Ben", likes: 3, reply: false },
        { name: "Anna", likes: 4, reply: true },
      ],
    };
    expect(commentReading(input, "filled")).toEqual([
      "r1: Sam · 0 likes",
      "r2: Lee replying to Sam · 2 likes",
      "r3: Maya replying to Sam · 1 like",
      "r4: Ben · 3 likes",
      "r5: Anna replying to Ben · 4 likes",
      "Reply",
    ]);
    expect(commentReading(input, "empty")).toEqual([]);
  });
});
