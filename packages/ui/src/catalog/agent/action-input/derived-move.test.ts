import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../probes";
import { liveProps, parseControlProps, planAct, readScreen } from "../index";

const props = z
  .strictObject({
    groups: z.array(z.strictObject({ label: z.string(), limit: z.int(), members: z.array(z.string()) })),
    waiting: z.array(z.string()),
  })
  .overwrite((input) => ({
    ...input,
    entries: [
      ...input.groups.map(() => ({})),
      ...input.groups.flatMap(({ members }, slot) => members.map((name) => ({ name, slot }))),
      ...input.waiting.map((name) => ({ name, slot: null })),
    ],
  }));
const def = {
  meta: {
    id: "DerivedMoveFixture",
    purpose: "Assign a member to a group.",
    pick: "Test fixture.",
    group: "input",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local",
    items: {
      key: "entries",
      parts: ["root"],
      prefix: "row",
      move: { column: "slot", columns: "groups", derived: true, capacity: "limit" },
    },
    actions: { items: { root: ["move"] } },
    read: (input) =>
      (input as { entries: { id: string; name?: string; slot?: number | null }[] }).entries.flatMap(
        ({ id, name, slot }) => (name ? [`${id} ${name}: ${slot ?? "waiting"}`] : []),
      ),
  },
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { DerivedMoveFixture: def };
const input = {
  groups: [
    { label: "First", limit: 1, members: ["One"] },
    { label: "Second", limit: 1, members: [] },
  ],
  waiting: ["Two", "Three"],
};
const screen = { id: "home", components: [{ id: "b1", c: def.meta.id, ...input }] };
const move = (row: number, value: string) => ({ address: `b1/row${row}`, action: "move", value });

it("offers only distinct destinations with room, and never offers move for a group row", () => {
  const reading = readScreen(screen, defs);
  expect(reading).toContain('row4 [b1/row4 move = null; choices ["Second"]]');
  expect(reading).toContain('row3 [b1/row3 move = "First"; choices ["Second"]]');
  expect(reading).not.toMatch(/\[b1\/row[12] move/);
  for (const target of ["First", "Unknown"])
    expect(planAct(screen, defs, {}, [move(4, target)], null)).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
});

it("recomputes occupancy between steps and rejects the entire batch if a destination filled", () => {
  const values = {};
  expect(planAct(screen, defs, values, [move(4, "Second"), move(5, "Second")], null)).toMatchObject({
    ok: false,
    at: 1,
    code: "not_actionable",
  });
  expect(values).toEqual({});

  const plan = planAct(screen, defs, values, [move(3, "Second"), move(4, "First")], null);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  expect(plan.changed).toEqual(['b1/row3 move = "Second"', 'b1/row4 move = "First"']);
  const reading = readScreen(screen, defs, plan.values);
  expect(reading).toContain("row3 One: 1");
  expect(reading).toContain("row4 Two: 0");
  expect(reading).toContain("row5 Three: waiting");
  expect(reading).not.toContain(" move");
});

it("projects repeated moves on the same stamped guest without changing its nested wire input", () => {
  const plan = planAct(screen, defs, {}, [move(3, "Second"), move(3, "First"), move(4, "Second")], null);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  const get = (part: string) => plan.values[`home/b1/${part}`];
  const parsed = parseControlProps(def, input, get);
  const local = Object.fromEntries(Object.entries(plan.values).map(([key, value]) => [key.slice(5), value]));
  expect(liveProps(def.meta, parsed, "b1", local, true)).toMatchObject({
    ...input,
    entries: [
      { id: "row1" },
      { id: "row2" },
      { id: "row3", name: "One", slot: 0 },
      { id: "row4", name: "Two", slot: 1 },
      { id: "row5", name: "Three", slot: null },
    ],
  });
  expect(input.waiting).toEqual(["Two", "Three"]);
});
