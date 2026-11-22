import { expect, it } from "vitest";
import { components, readScreen } from "@lmthing/ui/catalog";
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

it("keeps saved reply text out of read-only and terminal stories", () => {
  const def = components.StoryViewer;
  const entry = { ...def.examples[0]!, id: "s1", c: def.meta.id, replyDraft: "See you soon" };
  const read = (patch: { detail?: "brief"; state?: "success" }) =>
    readScreen({ id: "home", components: [{ ...entry, ...patch }] }, { StoryViewer: def });
  expect(read({})).toContain("See you soon");
  expect(read({ detail: "brief" })).not.toContain("See you soon");
  expect(read({ state: "success" })).toContain("Reply sent.");
  expect(read({ state: "success" })).not.toMatch(/See you soon|New fronds|Maya/);
});
