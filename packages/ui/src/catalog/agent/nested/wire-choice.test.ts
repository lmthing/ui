import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../probes";
import { planAct, readScreen } from "../index";

const child = z.strictObject({ chosen: z.enum(["a", "b"]) });
const parent = z.strictObject({ children: z.array(child) });
const rows = [{ children: [{ chosen: "a" as const }] }];
const def = {
  meta: {
    id: "NestedWireChoice",
    group: "input",
    purpose: "Choose a nested value.",
    pick: "Fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local.",
    items: {
      key: "rows",
      parts: ["root"],
      nested: {
        key: "children",
        parts: { choose: { action: "select", prop: "chosen", choices: ["a", "b"] } },
      },
    },
  },
  props: z.strictObject({ rows: z.array(parent) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const screenOf = (seed: unknown[]) => ({
  id: "home",
  components: [{ id: "c1", c: def.meta.id, rows: seed }],
});
const select = { address: "c1/r1/choose_1", action: "select", value: "b" };

it("does not offer nested selects on rows synthesized by schema or live derivation", () => {
  const transformed = { ...def, props: z.strictObject({ rows: z.array(parent).transform(() => rows) }) };
  const derived = { ...def, meta: { ...def.meta, live: { derive: () => ({ rows }) } } };
  const screen = screenOf([]);
  for (const definition of [transformed, derived]) {
    const defs = { NestedWireChoice: definition };
    expect(readScreen(screen, defs)).not.toContain("choose_1 select");
    expect(planAct(screen, defs, {}, [select])).toMatchObject({ ok: false, code: "not_actionable" });
  }
});

it("rejects a staged value that does not survive wire parsing at its target", () => {
  const overwritten = child.overwrite(() => ({ chosen: "a" }));
  const props = z.strictObject({ rows: z.array(parent.extend({ children: z.array(overwritten) })) });
  const defs = { NestedWireChoice: { ...def, props } };
  expect(planAct(screenOf(rows), defs, {}, [select])).toMatchObject({
    ok: false,
    code: "invalid_value",
    hint: "Value conflicts with component props",
  });
});
