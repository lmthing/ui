import { expect, it } from "vitest";
import { postCountParts, postReading } from "../../copy";

it("formats exact localized counts and pluralizes their reading", () => {
  expect(postCountParts({ likes: 1, comments: 99 }, "ar-EG")).toEqual([
    { part: "likes", count: "١", line: "١ like" },
    { part: "comments", count: "٩٩", line: "٩٩ comments" },
  ]);
  expect(postCountParts({ likes: 0, comments: 1 }).map(({ line }) => line)).toEqual(["0 likes", "1 comment"]);
});

it("keeps large counts short in the toolbar and exact in accessible copy", () => {
  expect(postCountParts({ likes: 23450, comments: 999999 }, "en-US")).toEqual([
    { part: "likes", count: "23.5K", line: "23450 likes" },
    { part: "comments", count: "1M", line: "999999 comments" },
  ]);
});

it("reads attachments in order only when drawn, and no content while loading", () => {
  const input = { likes: 0, comments: 1, media: "cover", images: ["lib:fern", "local:1"] };
  expect(postReading(input, "filled")).toEqual(["0 likes · 1 comment", "photo:fern", "photo:local:1"]);
  expect(postReading({ ...input, media: "none" }, "filled")).toEqual(["0 likes · 1 comment"]);
  expect(postReading(input, "loading")).toEqual([]);
});
