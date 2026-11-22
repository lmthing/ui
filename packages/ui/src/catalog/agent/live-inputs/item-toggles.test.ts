import { expect, it } from "vitest";
import type { Meta } from "../../meta";
import { projectItemToggles } from "./item-toggles";

const meta: Meta = {
  id: "Fixture",
  group: "input",
  purpose: "Toggle a row field",
  pick: "Toggle a row field",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local",
  items: { key: "rows", parts: ["save"], toggles: { save: "saved" } },
  actions: { items: { save: ["toggle"] } },
};
const seed = {
  rows: [
    { id: "s4", active: false, saved: true },
    { id: "s9", active: true, saved: false },
    { id: "s12", saved: true },
  ],
};

it("overlays both boolean values at stable row and part addresses without mutating the seed", () => {
  const values: Record<string, unknown> = {
    "s4/save": false,
    "s9/save": true,
    "s12/save": "false",
    "s12/other": false,
    s12: false,
  };
  const projected = projectItemToggles(meta, seed, (part) => values[part]);
  expect(projected.rows).toEqual([
    { id: "s4", active: false, saved: false },
    { id: "s9", active: true, saved: true },
    { id: "s12", saved: true },
  ]);
  expect((projected.rows as typeof seed.rows)[2]).toBe(seed.rows[2]);
  expect(seed.rows.map(({ saved }) => saved)).toEqual([true, false, true]);
});

it("leaves undeclared, missing, and unchanged rows alone", () => {
  const plain = { ...meta, items: { key: "rows", parts: ["save"] } };
  const empty = {};
  expect(projectItemToggles(plain, seed, () => false)).toBe(seed);
  expect(projectItemToggles(meta, empty, () => false)).toBe(empty);
  expect(projectItemToggles(meta, seed, () => undefined)).toBe(seed);
  expect(projectItemToggles(meta, seed, (part) => (part === "s4/save" ? true : undefined))).toBe(seed);
});
