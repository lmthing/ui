import { describe, expect, it } from "vitest";
import { bracketDrawing, bracketReading } from "../../copy";

const round = "Semi";
const ties = [
  { id: "r1", round, a: "A", b: "B", aScore: 2, bScore: 0 },
  { id: "r2", round, a: "C", b: "D", aScore: 0, bScore: 1 },
  { id: "r3", round, a: "E", b: "F", aScore: 0, bScore: 0 },
  { id: "r4", round, a: "G", b: "H", aScore: 0 },
  { id: "r5", round: "Final", a: "D", b: "A" },
];
const bracket = {
  rounds: [
    { label: round, ties: ties.slice(0, 4) },
    { label: "Final", ties: ties.slice(4) },
  ],
  ties,
  mine: "A",
};

describe("Bracket projection", () => {
  it("follows only decisive scores and matches the next round by name, not side or position", () => {
    const drawing = bracketDrawing(bracket);
    expect(drawing.links).toEqual([
      { from: "r1", to: "r5" },
      { from: "r2", to: "r5" },
    ]);
    expect(drawing.rounds[0]?.ties.map(({ winner }) => winner)).toEqual([0, 1, undefined, undefined]);
    expect(
      drawing.rounds.flatMap(({ ties }) => ties.filter(({ selected }) => selected).map(({ id }) => id)),
    ).toEqual(["r1", "r5"]);
    expect(bracketReading(bracket, "ar-EG")[0]).toBe("r1: Semi, A ٢ · B ٠ · A wins");
  });

  it("retains links when scores are hidden and does not guess between duplicate names", () => {
    const otherFinal = { id: "r6", round: "Final", a: "A", b: "G" };
    const final = [...ties.slice(4), otherFinal];
    const drawing = bracketDrawing({
      ...bracket,
      detail: "brief",
      ties: [...ties, otherFinal],
      rounds: [bracket.rounds[0]!, { label: "Final", ties: final }],
    });
    expect(drawing.links).toEqual([{ from: "r2", to: "r5" }]);
    expect(drawing.rounds[0]?.ties[0]).toMatchObject({ winner: 0, winnerLabel: "A wins" });
    expect(drawing.rounds[0]?.ties[0]?.sides[0].score).toBeUndefined();
  });
});
