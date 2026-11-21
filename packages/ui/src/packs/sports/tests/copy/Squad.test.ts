import { expect, it } from "vitest";
import { squadReading, squadSummary } from "../../copy";

const player = { name: "Ella", answer: "yes", reason: "Has a lift", picked: true } as const;

it("counts only yes, keeping availability and coach selection independent", () => {
  expect(squadSummary({ needed: 2, players: [player, { ...player, answer: "maybe" }] })).toBe("1 of 2");
});

it("localizes the reply and keeps the reason out of the brief reading", () => {
  const input = { needed: 2, players: [player] };
  expect(squadReading(input)).toEqual(["Available to play · 1 of 2", "Ella: Yes · Has a lift · Picked"]);
  expect(squadReading({ ...input, detail: "brief" })[1]).toBe("Ella: Yes · Picked");
});
