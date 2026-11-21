import { describe, expect, it } from "vitest";
import { playlistReading, playlistTiming } from "../../copy";

describe("playlist copy", () => {
  it("formats zero, partial and completed playback", () => {
    expect(playlistTiming(1, 0, "en")).toBe("0:01 · 0% played");
    expect(playlistTiming(245, 0.3, "en")).toBe("4:05 · 30% played");
    expect(playlistTiming(36000, 1, "en")).toBe("10:00:00 · Played");
    expect(playlistTiming(245, 0.3, "ar-EG")).toContain("٤:٠٥");
  });

  it("reads recordings in order and identifies the current recording", () => {
    const items = [
      { title: "First", seconds: 245, played: 0.3 },
      { title: "Second", seconds: 390, played: 0 },
    ];
    const lines = ["First · 4:05 · 30% played", "Second · 6:30 · 0% played"];
    expect(playlistReading({ items }, "en")).toEqual(lines);
    expect(playlistReading({ items, playing: 0 }, "en")).toEqual(["Now playing: First", ...lines]);
  });
});
