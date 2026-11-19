import { expect, it } from "vitest";
import { turnReading, visibleTurns } from "../../copy";

it("shows the current and two upcoming slots in order without changing the stored roster", () => {
  const people = ["Sam", "Alex", "Mia", "Lee"];
  expect(visibleTurns(people, 0)).toEqual(["Sam", "Alex", "Mia"]);
  expect(visibleTurns(people, 2)).toEqual(["Mia", "Lee", "Sam"]);
  expect(visibleTurns(people, 3)).toEqual(["Lee", "Sam", "Alex"]);
  expect(people).toEqual(["Sam", "Alex", "Mia", "Lee"]);
  expect(visibleTurns(["Sam", "Alex"], 1)).toEqual(["Alex", "Sam"]);
});

it("distinguishes the current turn from the queue and keeps the action labels unchanged", () => {
  expect(turnReading([{ name: "Sam" }, { name: "Alex" }, { name: "Mia" }])).toEqual([
    "Current turn: Sam",
    "Up next: Alex, Mia",
    "Done, next",
    "Skip",
  ]);
});
