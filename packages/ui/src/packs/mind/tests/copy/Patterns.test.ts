import { describe, expect, it } from "vitest";
import { patternReport, readFindings, seededJournal } from "../../copy";

const input = { factors: ["Fresh air", "Music"], minDays: 14 };
const journal = Array.from({ length: 14 }, (_, index) => ({
  date: `2024-02-${String(index + 16).padStart(2, "0")}`,
  mood: index < 7 ? 4 : 2,
  tags: index < 7 ? [" FRESH AIR "] : ["Music"],
}));

describe("pattern calculations", () => {
  it("counts distinct valid days and ignores malformed records", () => {
    const records = [
      ...journal.slice(0, 13),
      journal[0],
      null,
      {},
      { date: "2024-02-30", mood: 3, tags: [] },
      { date: "2024-02-29", mood: 0, tags: [] },
      { date: "2024-02-29", mood: 2.5, tags: [] },
      { date: "2024-02-29", mood: Infinity, tags: [] },
      { date: "2024-02-29", mood: 3, tags: ["ok", 3] },
    ];
    expect(patternReport(input, "filled", "en", records)).toEqual({
      part: "days_left",
      message: "Log 1 more day.",
    });
  });
  it("compares equal-weight daily means, even when one day has several check-ins", () => {
    const records = [...journal, { date: "2024-02-16", mood: 1, tags: [] }];
    expect(patternReport(input, "filled", "en", records)).toEqual({
      findings: [
        { id: "r1", sentence: "Higher mood with Fresh air", withAverage: 3.8, withoutAverage: 2 },
        { id: "r2", sentence: "Lower mood with Music", withAverage: 2, withoutAverage: 3.8 },
      ],
    });
  });
  it("requires both groups, skips repeated factors and avoids a directional claim for equal averages", () => {
    const records = journal.map((entry) => ({ ...entry, mood: 3, tags: [...entry.tags, "Always"] }));
    const factors = ["Always", "Music", "music", "Missing"];
    expect(patternReport({ ...input, factors }, "filled", "en", records)).toEqual({
      findings: [
        {
          id: "r2",
          sentence: "Similar mood with Music",
          withAverage: 3,
          withoutAverage: 3,
        },
      ],
    });
  });
  it("shares localized decimal formatting with the chart and omits values in brief readings", () => {
    const records = [...journal, { date: "2024-02-16", mood: 1, tags: [] }];
    expect(readFindings(input, "filled", "fr-FR", records)[2]).toBe("With factor: 3,8");
    expect(readFindings({ ...input, detail: "brief" }, "filled", "en", records)).toEqual([
      "Mood patterns",
      "Higher mood with Fresh air",
      "Lower mood with Music",
    ]);
  });
});

describe("pattern previews", () => {
  it("builds deterministic fixture records at the highest threshold and three days short for empty", () => {
    const max = { factors: ["Fresh air", "Music", "Long shift", "Early start"], minDays: 60 };
    const filled = seededJournal(max, "filled");
    expect(filled).toEqual(seededJournal(max, "filled"));
    expect(new Set(filled.map(({ date }) => date)).size).toBe(60);
    const report = patternReport(max, "filled", "en", filled);
    expect("findings" in report && report.findings).toHaveLength(4);
    expect(patternReport(max, "empty", "en", seededJournal(max, "empty"))).toEqual({
      part: "days_left",
      message: "Log 3 more days.",
    });
  });
});
