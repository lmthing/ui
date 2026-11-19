import { expect, it } from "vitest";
import { z } from "zod";
import { type Definition, type ScreenLike, readScreen } from "@lmthing/ui/catalog";
import { readControls } from "./read-controls";

const def: Definition = {
  meta: {
    id: "Fixture",
    group: "input",
    purpose: "Enter a number",
    pick: "Enter a number",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local entry",
    actions: { items: { amount: ["type"] } },
    items: { key: "rows", parts: ["amount"] },
    read: (input) => (input as { rows: { value: number | string }[] }).rows.map(({ value }) => `${value}`),
  },
  props: z.strictObject({ rows: z.array(z.strictObject({ value: z.number() })) }).meta({
    keypadParts: ["amount"],
  }),
  fallback: () => ({ rows: [] }),
  examples: [],
  probes: [],
};

it("projects drafts for only the matching component instance and item", () => {
  const screen: ScreenLike = {
    id: "home",
    title: "Numbers",
    components: [
      { id: "first", c: "Fixture", rows: [{ value: 2 }, { value: 3 }] },
      { id: "second", c: "Fixture", rows: [{ value: 4 }] },
      { id: "other", c: "Unknown" },
    ],
  };
  const defs = { Fixture: def };
  expect(readControls(screen, defs, {})).toBe(readScreen(screen, defs));
  const read = readControls(screen, defs, { "home/first/r2/amount": "3." });
  expect(read).toContain("first Fixture 2 — 3.\n");
  expect(read).toContain('[first/r2/amount type = "3."]');
  expect(read).toContain("second Fixture 4\n");
  expect(read).toContain("other Unknown (unknown)");
  expect(screen.components[0]!.rows).toEqual([{ value: 2 }, { value: 3 }]);
});
