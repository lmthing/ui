import { expect, it } from "vitest";
import { teamPickerCopy, teamPickerReading } from "../../copy";

const setup = {
  players: [{ name: "Ari" }, { name: "Jules", team: 0 }, { name: "Kit" }, { name: "Ren" }],
  teams: [{ label: "East" }, { label: "West" }],
};

it("shows unassigned players before the teams that are waiting to draw", () => {
  expect(teamPickerCopy(setup, undefined).panels).toEqual([
    {
      id: "unassigned",
      label: "Unassigned",
      count: "3",
      players: [setup.players[0], setup.players[2], setup.players[3]],
    },
    { id: "team_0", label: "East", count: "1", players: [setup.players[1]] },
    { id: "team_1", label: "West", count: "0", players: [] },
  ]);
  expect(teamPickerReading(setup, undefined)).toContain("West (0): No players yet");
});

it("reads grouped names, localized counts and the redraw action from the stored assignment", () => {
  const draw = { kind: "partition", teams: [1, 0, 1, 0] } as const;
  expect(teamPickerReading(setup, draw, "ar-EG")).toEqual([
    "Teams are set",
    "East (٢): Jules (locked), Ren",
    "West (٢): Ari, Kit",
    "Redraw teams",
  ]);
});
