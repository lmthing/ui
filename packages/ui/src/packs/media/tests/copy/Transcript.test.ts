import { describe, expect, it } from "vitest";
import { activeTranscriptIndex, transcriptLineIdentity, transcriptReading } from "../../copy";

const lines = [
  { at: 3, text: "Lights up", speaker: "Ada" },
  { at: 7, text: "Quiet again" },
];

describe("active transcript line", () => {
  it.each([
    [undefined, 1],
    [2.999, -1],
    [3, 0],
    [6.999, 0],
    [7, 1],
    [60, 1],
  ])("at %s seconds, resolves index %s", (playhead, index) => {
    expect(activeTranscriptIndex({ lines, current: 1, playhead })).toBe(index);
  });

  it("reads the formatted cue and speaker without treating follow as the source of the highlight", () => {
    expect(transcriptReading({ lines, follow: true, current: 1 })).toEqual([
      "Following playback",
      "0:03 Ada: Lights up",
      "0:07 Quiet again · Current line",
    ]);
    expect(transcriptReading({ lines, follow: false, playhead: 4 }, "en")).toEqual([
      "Not following playback",
      "0:03 Ada: Lights up · Current line",
      "0:07 Quiet again",
    ]);
    expect(transcriptReading({ lines, follow: false, playhead: 4 }, "ar-EG")).toEqual([
      "Not following playback",
      "٠:٠٣ Ada: Lights up · Current line",
      "٠:٠٧ Quiet again",
    ]);
  });

  it("keeps the save identity stable on reorder and changes it when the content is replaced", () => {
    const item = { ...lines[0]!, text: '"'.repeat(160) };
    const identity = transcriptLineIdentity({ ...item, id: "r1" });
    expect(identity?.length).toBeLessThanOrEqual(160);
    expect(transcriptLineIdentity({ ...item, id: "r2" })).toBe(identity);
    expect(transcriptLineIdentity({ ...item, speaker: "Jo" })).not.toBe(identity);
    expect(transcriptLineIdentity({ ...item, text: "Replaced" })).not.toBe(identity);
  });
});
