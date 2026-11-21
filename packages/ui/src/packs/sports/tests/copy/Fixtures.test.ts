import { describe, expect, it } from "vitest";
import { fixtureCopy } from "../../copy";
import { registerSportsWords, sportsWordsFor } from "../../lang";

const row = { opponent: "River Rovers", date: "2026-11-22", time: "10:00", home: true };

describe("fixture copy", () => {
  it.each([
    [3, 1, "3–1", "Win", "good"],
    [0, 0, "0–0", "Draw", "muted"],
    [1, 3, "1–3", "Loss", "bad"],
  ])("derives the result from %s–%s", (us, them, score, label, tone) => {
    expect(fixtureCopy({ ...row, us, them }).result).toEqual({ score, label, tone });
  });
  it("leaves an unplayed fixture without a result and derives round-badge initials", () => {
    expect(fixtureCopy(row)).toMatchObject({ initials: "RR", side: "Home", result: undefined });
    expect(fixtureCopy({ ...row, opponent: "Étoile", home: false }).initials).toBe("É");
  });
  it("uses the requested dictionary and locale for dates, clocks and scores", () => {
    const unregister = registerSportsWords("ar-EG", {
      ...sportsWordsFor(),
      fixtureAway: "خارج الأرض",
      fixtureMeet: (time) => `التجمع ${time}`,
    });
    try {
      const localized = fixtureCopy({ ...row, home: false, us: 3, them: 1, meet: "09:40" }, "ar-EG");
      expect(localized).toMatchObject({ time: "١٠:٠٠", side: "خارج الأرض", meet: "التجمع ٠٩:٤٠" });
      expect(localized.date).toContain("٢٠٢٦");
      expect(localized.result?.score).toBe("٣–١");
    } finally {
      unregister();
    }
  });
});
