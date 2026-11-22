import { expect, it } from "vitest";
import { transcriptReading } from "../../copy";

const lines = [
  { at: 4, text: "First line" },
  { at: 9, speaker: "Nora", text: "Second line" },
];

it("marks the initial or most recent line and localizes timestamps independently of auto-follow", () => {
  expect(transcriptReading({ lines, follow: true, current: 0 })).toEqual([
    "Following playback",
    "0:04 First line · Current line",
    "0:09 Nora: Second line",
  ]);
  expect(transcriptReading({ lines, follow: false, playhead: 9 }, "ar-EG")).toEqual([
    "Not following playback",
    "٠:٠٤ First line",
    "٠:٠٩ Nora: Second line · Current line",
  ]);
  expect(transcriptReading({ lines, follow: true, current: 0, playhead: 3 })).not.toContain(
    "0:04 First line · Current line",
  );
});
