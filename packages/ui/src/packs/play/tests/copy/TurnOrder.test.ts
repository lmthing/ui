import { expect, it } from "vitest";
import { turnOrderLines } from "../../copy";

const players = [{ name: "Anna" }, { name: "Ben" }];

it("reads the active player, direction, and an open-ended lap", () => {
  expect(turnOrderLines({ players }, { index: 1, direction: "reverse", lap: 3 }, false)).toEqual({
    status: "Current turn",
    player: "Ben",
    lap: "Lap 3 · Reverse",
  });
});

it("formats both bounded lap counters in the requested language at completion", () => {
  expect(
    turnOrderLines({ players, laps: 12 }, { index: 0, direction: "forward", lap: 12 }, true, "ar-EG"),
  ).toEqual({ status: "Game complete", player: "Last turn: Anna", lap: "Lap ١٢ of ١٢ · Forward" });
});
