import { selectedEntries } from "../../../../scripts/build";
import { describe, expect, it } from "vitest";
import { components, type Definition } from "@lmthing/ui/catalog";

const defs = components as Record<string, Definition>;
const players = [{ name: "Anna" }, { name: "Ben" }];
const teams = [{ label: "Leaves" }, { label: "Roots" }];
const question = { question: "Question", answer: "Answer" };
const invalid = {
  ScoreSheet: [
    { players: [], rounds: [{ label: "One", points: [1, 2] }] },
    { players, rounds: [] },
    { players, rounds: [{ label: "One", points: [1] }] },
    { players, rounds: [{ label: "One", points: [1, 2, 3] }] },
    { players, rounds: [{ label: "One", points: [1000, 2] }] },
    { players, rounds: [{ label: "One", points: [-1000, 2] }] },
    { players, rounds: [{ label: "One", points: [1.5, 2] }] },
    { players, rounds: Array.from({ length: 13 }, () => ({ label: "One", points: [1, 2] })) },
    { players: [{ name: "a".repeat(25) }, players[1]], rounds: [{ label: "One", points: [1, 2] }] },
    { players, rounds: [{ label: "a".repeat(17), points: [1, 2] }] },
    { ...components.ScoreSheet.examples[0], totals: [4, 2] },
  ],
  Dice: [
    { count: 0 },
    { count: 7 },
    { count: 1.5 },
    { sides: 5 },
    { sides: 20 },
    { count: 2, faces: [1, 4] },
    { held: [true, false] },
    { sum: 5 },
  ],
  Spinner: [
    { options: [] },
    { options: [{ label: "One" }] },
    { options: Array.from({ length: 7 }, (_, index) => ({ label: String(index) })) },
    { options: [{ label: "Mime" }, { label: " mime " }] },
    { options: [{ label: "a".repeat(25) }, { label: "Two" }] },
    { ...components.Spinner.examples[0], at: 1 },
  ],
  Trivia: [
    { questions: [] },
    { questions: Array.from({ length: 7 }, () => question) },
    { questions: [{ ...question, question: "a".repeat(121) }] },
    { questions: [{ ...question, answer: "a".repeat(121) }] },
    { questions: [{ ...question, explain: "a".repeat(161) }] },
    { questions: [{ ...question, points: 0 }] },
    { questions: [{ ...question, points: 21 }] },
    { questions: [{ ...question, photo: "https://example.org/photo" }] },
    { questions: [{ ...question, correct: true }] },
    { questions: [question], revealed: true },
  ],
  TurnOrder: [
    { players: [] },
    { players: [players[0]] },
    { players: Array.from({ length: 7 }, () => players[0]) },
    { players, first: 2 },
    { players, first: -1 },
    { players, laps: 0 },
    { players, laps: 13 },
    { players: [{ name: "a".repeat(25) }, players[1]] },
    { players, current: 1 },
  ],
  TeamPicker: [
    { players: [], teams },
    { players, teams: [] },
    { players, teams: [{ label: "A" }, { label: "B" }, { label: "C" }] },
    { players, teams: [{ label: "Leaves" }, { label: " leaves " }] },
    { players: [{ name: "Anna", team: 2 }, players[1]], teams },
    { players: Array.from({ length: 13 }, () => players[0]), teams },
    { players, teams: [{ label: "a".repeat(17) }, teams[1]] },
    { players, teams, assignments: [0, 1] },
  ],
};
describe("play schema boundaries", () => {
  it.each(selectedEntries(invalid))(
    "rejects %s invalid bounds, references and computed props",
    (id, inputs) => {
      for (const input of inputs) expect(defs[id]!.props.safeParse(input).success).toBe(false);
    },
  );
  it("accepts maximum scores, counts, text, optional references and dice side variants", () => {
    expect(
      components.ScoreSheet.props.safeParse({
        players: Array.from({ length: 6 }, () => ({ name: "a".repeat(24) })),
        rounds: Array.from({ length: 12 }, () => ({
          label: "a".repeat(16),
          points: [-999, 999, null, 0, 1, -1],
        })),
      }).success,
    ).toBe(true);
    for (const sides of [4, 6, 8, 10, 12, 20])
      expect(components.Dice.props.safeParse({ count: 6, sides, style: "numbers" }).success).toBe(true);
    expect(
      components.Spinner.props.safeParse({
        options: Array.from({ length: 6 }, (_, index) => ({ label: String(index).repeat(24) })),
      }).success,
    ).toBe(true);
    expect(
      components.Trivia.props.safeParse({
        questions: Array.from({ length: 6 }, () => ({
          question: "a".repeat(120),
          answer: "a".repeat(120),
          explain: "a".repeat(160),
          points: 20,
          photo: "local:1",
        })),
      }).success,
    ).toBe(true);
    expect(
      components.TurnOrder.props.safeParse({
        players: Array.from({ length: 6 }, () => ({ name: "a".repeat(24), photo: "local:1" })),
        first: 5,
        laps: 12,
      }).success,
    ).toBe(true);
    expect(
      components.TeamPicker.props.safeParse({
        players: Array.from({ length: 12 }, () => ({ name: "a".repeat(24), photo: "local:1", team: 3 })),
        teams: Array.from({ length: 4 }, (_, index) => ({ label: String(index).repeat(16) })),
      }).success,
    ).toBe(true);
  });
  it("keeps infeasible team locks as valid seed data for the declared runtime error state", () => {
    expect(
      components.TeamPicker.props.safeParse({
        players: players.map((player) => ({ ...player, team: 0 })),
        teams,
      }).success,
    ).toBe(true);
  });
});
