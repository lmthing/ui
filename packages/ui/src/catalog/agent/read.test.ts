import { expect, it } from "vitest";
import { z } from "zod";
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
