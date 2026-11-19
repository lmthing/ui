import { expect, it } from "vitest";
import { z } from "zod";
import { randomIndex, drawPartition, partitionPlan } from "./draw";
import { readComponent, type Definition, text } from "../index";

const parts = ["root", "roll", "reset", "restart", "reverse", "remake", "r", "r1x", "r1_suffix"];
const props = z.strictObject({
  rows: z
    .array(z.strictObject({ label: text(24) }))
    .min(0)
    .max(12),
});
const fixture = {
  meta: {
    id: "ReaderFixture",
    group: "action",
    purpose: "Read addressed actions.",
    pick: "A reader regression fixture.",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "A bounded local fixture.",
    parts,
    items: { key: "rows", parts: ["root", "score"] },
    actions: {
      parts: Object.fromEntries(parts.map((part) => [part, ["press"] as const])),
      items: { root: ["press"], score: ["set"] },
    },
  },
  props,
  fallback: () => ({ rows: [] }),
  examples: [{ rows: [{ label: "First" }] }],
  probes: [],
} satisfies Definition;

it.each(["c1", "home/game_one"])("keeps r-prefixed controls on %s above real item actions", (instance) => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ label: String(index + 1) }));
  const [head, ...items] = readComponent(fixture, { rows }, instance);
  for (const part of parts) {
    const address = part === "root" ? instance : `${instance}/${part}`;
    expect(head).toContain(`[${address} press]`);
  }
  expect(items).toHaveLength(12);
  for (let index = 0; index < rows.length; index++) {
    const address = `${instance}/r${index + 1}`;
    expect(head).not.toContain(`[${address} press]`);
    expect(head).not.toContain(`[${address}/score set]`);
    expect(items[index]).toContain(`[${address} press]`);
    expect(items[index]).toContain(`[${address}/score set]`);
  }
});

it("retains top-level r-prefixed controls when the runtime item array is empty", () => {
  const lines = readComponent(fixture, { rows: [] }, "c1");
  expect(lines).toHaveLength(1);
  for (const part of parts) expect(lines[0]).toContain(`[${part === "root" ? "c1" : `c1/${part}`} press]`);
});

it("still omits all controls in a non-filled state", () => {
  expect(readComponent(fixture, fixture.examples[0], "c1", "loading")).toEqual([
    "c1 ReaderFixture (loading)",
  ]);
});

it("rejects the high tail before taking a remainder", () => {
  const words = [0xffff_ffff, 0xffff_fffe, 5];
  expect(randomIndex(6, () => words.shift()!)).toBe(5);
  expect(words).toEqual([]);
});

it("keeps six buckets approximately even with a fixed seed", () => {
  let seed = 123456789;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const counts = Array<number>(6).fill(0);
  for (let i = 0; i < 60000; i++) {
    const index = randomIndex(6, random);
    counts[index] = counts[index]! + 1;
  }
  for (const count of counts) expect(Math.abs(count - 10000)).toBeLessThan(300);
});

it("uses no entropy for a single possible result", () => {
  expect(
    randomIndex(1, () => {
      throw new Error("Unexpected entropy");
    }),
  ).toBe(0);
});

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
