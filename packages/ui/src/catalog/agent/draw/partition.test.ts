import { expect, it } from "vitest";
import { drawPartition, partitionPlan } from "./partition";

it("chooses each feasible larger team and distributes the remaining slots", () => {
  const locked = [0, 0, undefined, undefined, undefined, undefined, undefined];
  const plan = partitionPlan(locked, 3)!;
  let seed = 17;
  const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
  const larger = [0, 0, 0];
  for (let i = 0; i < 600; i++) {
    const teams = drawPartition(plan, random);
    expect(teams.slice(0, 2)).toEqual([0, 0]);
    const sizes = [0, 1, 2].map((team) => teams.filter((assignment) => assignment === team).length);
    expect([...sizes].sort()).toEqual([2, 2, 3]);
    const index = sizes.indexOf(3);
    larger[index] = larger[index]! + 1;
  }
  for (const count of larger) expect(Math.abs(count - 200)).toBeLessThan(45);
});

it("honours a larger team forced by locks and rejects infeasible locks", () => {
  const plan = partitionPlan([0, 0, 0, undefined, undefined, undefined, undefined], 3)!;
  expect(drawPartition(plan, () => 0)).toEqual([0, 0, 0, 1, 2, 2, 1]);
  expect(partitionPlan([0, 0, 0, undefined], 2)).toBeUndefined();
  expect(partitionPlan([0, 0, 0, 0, 1, 1, 1, 1, undefined, undefined], 3)).toBeUndefined();
  expect(partitionPlan([0, 2], 2)).toBeUndefined();
});

it("shuffles every unlocked player uniformly across a fixed capacity choice", () => {
  const plan = partitionPlan([0, 0, 0, undefined, undefined, undefined, undefined], 3)!;
  let seed = 12345;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const assignments = new Map<string, number>();
  for (let i = 0; i < 6000; i++) {
    const seats = drawPartition(plan, random).slice(3).join("");
    assignments.set(seats, (assignments.get(seats) ?? 0) + 1);
  }
  expect([...assignments.keys()].sort()).toEqual(["1122", "1212", "1221", "2112", "2121", "2211"]);
  for (const count of assignments.values()) expect(Math.abs(count - 1000)).toBeLessThan(120);
});
