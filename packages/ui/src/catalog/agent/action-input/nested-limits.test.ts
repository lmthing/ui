import { expect, it } from "vitest";
import { z } from "zod";
import { text } from "../../props";
import type { Definition } from "../../probes";
import { readComponent, planAct } from "../index";

const def = {
  meta: {
    id: "PolicyFixture",
    group: "input",
    purpose: "Choose related options.",
    pick: "A fixture for nested policies.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local options.",
    items: {
      key: "rows",
      parts: ["root", "pick_1"],
      nested: {
        key: "options",
        activeParent: true,
        maxActive: 1,
        parts: { pick: { action: "toggle", prop: "on" } },
      },
    },
    select: { prop: "parent", value: { field: "label" } },
    actions: { items: { root: ["select"] } },
    read: (input) =>
      (input as { rows: { options: unknown[] }[] }).rows.map(({ options }) => `shown ${options.length}`),
  },
  props: z.strictObject({
    parent: z.string().optional(),
    rows: z.array(
      z.strictObject({
        label: text(12),
        options: z.array(z.strictObject({ label: text(12), on: z.boolean() })),
      }),
    ),
  }),
  examples: [],
  fallback: () => ({}),
  probes: [],
} satisfies Definition;
const input = {
  parent: "Second",
  rows: [
    { label: "First", options: [{ label: "Hidden", on: true }] },
    { label: "Second", options: [{ label: "Visible", on: false }] },
  ],
};

it("shows only the selected parent's nested text in both generic and custom reads", () => {
  const [head, first, second] = readComponent(def, input, "c1");
  expect(head).toContain("shown 0 — shown 1 — remaining 0");
  expect(first).toBe('  r1 "First" [c1/r1 select]');
  expect(second).toBe('  r2 "Second" · "Visible" [c1/r2 select]');
  expect(readComponent(def, { rows: input.rows }, "c1").join("\n")).toContain("[c1/r1/pick_1 toggle:on]");
});

it("lets a wire-backed toggle free a slot for a choice under another parent", () => {
  const screen = { id: "s", components: [{ id: "c1", c: def.meta.id, ...input }] };
  const defs = { [def.meta.id]: def };
  const activation = { address: "c1/r2/pick_1", action: "toggle" };
  expect(planAct(screen, defs, {}, [activation])).toMatchObject({ ok: false, code: "max_active" });
  const result = planAct(screen, defs, {}, [
    { address: "c1/r1", action: "select" },
    { address: "c1/r1/pick_1", action: "toggle" },
    { address: "c1/r2", action: "select" },
    activation,
  ]);
  expect(result).toMatchObject({ ok: true, values: { "s/c1/r1/pick_1": false, "s/c1/r2/pick_1": true } });
});
