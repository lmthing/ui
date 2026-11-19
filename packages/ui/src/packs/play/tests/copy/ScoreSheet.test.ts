import { describe, expect, it } from "vitest";
import { scoreCopy, scoreReading } from "../../copy";

const input = {
  players: [{ name: "A" }, { name: "B" }, { name: "C" }],
  rounds: [
    { label: "First", points: [7, 7, 2] },
    { label: "Second", points: [-2, -2, 0] },
  ],
  wins: "high",
  style: "grid",
  share: false,
} as const;

describe("ScoreSheet copy", () => {
  it("adds signed points, awards both tied winners and uses competition ranks", () => {
    const copy = scoreCopy(input);
    expect(copy.progress).toBe("2 of 2 rounds complete");
    expect(copy.players.map(({ total, standing }) => [total, standing])).toEqual([
      ["5", "Tied winner"],
      ["5", "Tied winner"],
      ["2", "Rank 3"],
    ]);
  });
  it("reverses ranking for low-score games", () => {
    expect(scoreCopy({ ...input, wins: "low" }).players.map(({ standing }) => standing)).toEqual([
      "Rank 2",
      "Rank 2",
      "Winner",
    ]);
  });
  it("does not mark winners with unplayed cells, and counts entered zeroes", () => {
    const rounds = [{ label: "First", points: [0, null, -2] }];
    const result = scoreCopy({ ...input, rounds });
    expect(result.progress).toBe("0 of 1 round complete");
    expect(result.players).toMatchObject([
      { total: "0", winner: false },
      { total: "—", winner: false },
      { total: "-2", winner: false },
    ]);
  });
  it("localizes visible numbers but retains the wire addresses", () => {
    const read = scoreReading({ ...input, selectedRound: "2", style: "round" }, "ar-EG").join("\n");
    expect(read).toContain("٢ of ٢ rounds complete");
    expect(read).toContain("r4 A, Second: ");
    expect(read).not.toContain("r1 A, First");
  });
});
