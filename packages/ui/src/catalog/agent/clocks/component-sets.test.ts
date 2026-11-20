import { expect, it } from "vitest";
import type { Meta } from "../../meta";
import { projectComponentSets } from "./component-sets";

const meta = {
  id: "Fixture",
  group: "input",
  purpose: "Edit a date and display mode.",
  pick: "A date and mode fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local values.",
  set: {
    date: { type: "date", prop: "on", min: "2024-02-01" },
    mode: { type: "choice", prop: "view", choices: ["all", "active"] },
    amount: { prop: "quantity" },
  },
} satisfies Meta;

it("projects only accepted stored values without mutating the seed", () => {
  const seed = { on: "2024-02-01", view: "all", quantity: 1 };
  const values = {
    "$adjust/on": "2024-02-29",
    "$adjust/view": "active",
    "$adjust/quantity": 2,
  };
  expect(projectComponentSets(meta, seed, (key) => values[key as keyof typeof values])).toEqual({
    on: "2024-02-29",
    view: "active",
    quantity: 2,
  });
  const invalid: Record<string, unknown> = {
    "$adjust/on": "2024-01-31",
    "$adjust/view": "unknown",
    "$adjust/quantity": "2",
  };
  expect(projectComponentSets(meta, seed, (key) => invalid[key])).toBe(seed);
  expect(seed).toEqual({ on: "2024-02-01", view: "all", quantity: 1 });
});
