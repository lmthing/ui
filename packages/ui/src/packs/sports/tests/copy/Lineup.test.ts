import { describe, expect, it } from "vitest";
import { formationLabel, lineupReading, pitchLines } from "../../copy";

const players = [
  { id: "r1", name: "Porter", line: 0, number: 0 },
  { id: "r2", name: "Banks", line: 1, number: 5 },
  { id: "r3", name: "Lee", line: 1, number: 6 },
  { id: "r4", name: "Rivers", line: undefined, number: 99 },
];
const lines = [{ players: players.slice(0, 1) }, { players: players.slice(1, 3) }];

describe("Lineup projection", () => {
  it("keeps back-to-front groups, addresses and localized shirts, excluding substitutes", () => {
    const pitch = pitchLines(players, "ar-EG");
    expect(pitch.map(({ players }) => players.map(({ id, number }) => [id, number]))).toEqual([
      [["r1", "٠"]],
      [
        ["r2", "٥"],
        ["r3", "٦"],
      ],
    ]);
    expect(pitch[1]?.players[1]).toMatchObject({ target: { item: "r3", part: "root" }, namePart: "name" });
    expect(formationLabel(lines, "ar-EG")).toBe("١–٢");
  });

  it("places the bench after the starting lines and hides only the count in brief detail", () => {
    const full = lineupReading({ lines, players });
    expect(full).toEqual([
      "Starting lineup",
      "1–2",
      "r1: Porter #0",
      "r2: Banks #5",
      "r3: Lee #6",
      "Substitutes",
      "r4: Rivers #99",
    ]);
    expect(lineupReading({ lines, players, detail: "brief" })).toEqual(full.filter((line) => line !== "1–2"));
    expect(lineupReading({ lines, players: players.slice(0, 3) })).not.toContain("Substitutes");
  });
});
