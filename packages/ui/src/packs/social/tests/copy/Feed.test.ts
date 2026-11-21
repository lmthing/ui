import { describe, expect, it } from "vitest";
import { feedCountParts, feedReading } from "../../copy";

describe("Feed copy", () => {
  it("uses singular, plural and localized digits", () => {
    expect(feedCountParts({ likes: 1, comments: 0 })).toEqual([
      { part: "likes", count: "1", after: " like" },
      { part: "comments", count: "0", after: " comments" },
    ]);
    expect(feedCountParts({ likes: 1234, comments: 2 }, "ar-EG")[0]?.count).toBe("١٢٣٤");
  });

  it("keeps counts identified by post and quiet outside filled", () => {
    const input = {
      posts: [
        { likes: 1, comments: 0 },
        { likes: 0, comments: 2 },
      ],
    };
    expect(feedReading(input, "filled")).toEqual(["r1: 1 like · 0 comments", "r2: 0 likes · 2 comments"]);
    expect(feedReading(input, "empty")).toEqual([]);
    expect(feedReading(input, "loading")).toEqual([]);
  });
});
