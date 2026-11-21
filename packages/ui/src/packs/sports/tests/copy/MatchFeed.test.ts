import { describe, expect, it } from "vitest";
import { matchFeedReading, matchMinute } from "../../copy";

describe("MatchFeed copy", () => {
  it("formats match minutes with the active locale", () => {
    expect(matchMinute(0)).toBe("0′");
    expect(matchMinute(130, "ar-EG")).toBe("١٣٠′");
  });

  it("reads the minute, side and kind without changing authored text or order", () => {
    const events = [
      { minute: 62, side: "away", kind: "card_red", text: "Banks sent off" },
      { minute: 28, side: "home", kind: "sub", text: "Moss on for Reed" },
    ] as const;
    expect(matchFeedReading(events, "ar-EG")).toEqual([
      "٦٢′ Away · Red card: Banks sent off",
      "٢٨′ Home · Sub: Moss on for Reed",
    ]);
  });
});
