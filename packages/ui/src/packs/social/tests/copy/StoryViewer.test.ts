import { expect, it } from "vitest";
import { storyViewerReading } from "../../copy";

it("reads only the selected slide and uses story-specific terminal copy", () => {
  const input = {
    author: "Jordan",
    current: 1,
    slides: [
      { time: "Earlier", caption: "First" },
      { time: "Now", sticker: { label: "Vote" } },
    ],
  };
  expect(storyViewerReading(input, "filled")).toEqual(["Jordan", "Slide 2 of 2", "Now", "Vote"]);
  expect(storyViewerReading(input, "loading")).toEqual([]);
  expect(storyViewerReading(input, "empty")).toEqual(["This story is no longer available."]);
  expect(storyViewerReading(input, "success")).toEqual(["Reply sent."]);
});
