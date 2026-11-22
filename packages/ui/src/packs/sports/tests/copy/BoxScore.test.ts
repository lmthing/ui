import { expect, it } from "vitest";
import { boxScoreReading, boxScoreTotals } from "../../copy";

it("totals each side and reads each period and the visible player's stats", () => {
  const periods = [
    { label: "Q1", home: 20, away: 18 },
    { label: "Q2", home: 14, away: 21 },
  ];
  const totals = boxScoreTotals(periods);
  expect(totals).toEqual({ home: 34, away: 39 });
  const input = {
    home: "Lions",
    away: "Fern",
    periods,
    totals,
    style: "players" as const,
    team: "away" as const,
    columns: ["PTS", "REB", "AST"],
    players: [{ id: "r4", name: "Sam", stats: ["10", "5", "6"] }],
  };
  expect(boxScoreReading(input, "ar-u-nu-arab")).toEqual([
    "Box score",
    "٣٤–٣٩",
    "Lions · Fern",
    "Team",
    "Total: Lions ٣٤, Fern ٣٩",
    "Q1: Lions ٢٠, Fern ١٨",
    "Q2: Lions ١٤, Fern ٢١",
    "Player statistics: Fern",
    "PTS",
    "REB",
    "AST",
    "r4: Sam · PTS 10, REB 5, AST 6",
  ]);
  expect(boxScoreReading({ ...input, style: "linescore" })).toHaveLength(7);
});
