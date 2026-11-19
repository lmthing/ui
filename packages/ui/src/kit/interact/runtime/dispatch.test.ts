import { z } from "zod";
import { describe, expect, it } from "vitest";
import { text, type Definition, type ScreenLike } from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";

const definition: Definition = {
  meta: {
    id: "Fixture",
    group: "input",
    purpose: "Enter a number",
    pick: "Enter a number",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local entry",
    parts: ["root", "value", "amount", "pad"],
    actions: { parts: { amount: ["type"], pad: ["type"] } },
    read: (input) => {
      const { value } = input as { value?: number | string };
      return value === undefined || value === "" ? [] : [`Value ${value}`];
    },
  },
  props: z
    .strictObject({
      label: text(20),
      value: z.number().nonnegative().optional(),
      max: z.number().optional(),
      decimals: z.int().nonnegative().optional(),
    })
    .meta({ keypadParts: ["amount"] }),
  fallback: () => ({ label: "Value" }),
  examples: [],
  probes: [],
};
const defs = { Fixture: definition };
const screen: ScreenLike = {
  id: "home",
  components: [{ id: "c1", c: "Fixture", label: "Value", value: 2, max: 50, decimals: 2 }],
};
const pad = "home/c1/amount";
const type = (value: unknown, address = pad) => ({ address, action: "type", value });

function setup(mounted: boolean) {
  const store = createInteractionStore();
  const runtime = mounted ? createScreenController({ screen, defs, store, requireMounted: true }) : undefined;
  for (const part of [pad, "home/c1/pad"]) runtime?.registerPart(part);
  const agent = createAgentAccess({ defs, current: () => screen, store, ...(runtime ? { runtime } : {}) });
  return { act: runtime?.act ?? agent.act, agent, store, runtime };
}

describe.each([true, false])("numeric typing with controller: %s", (mounted) => {
  it("edits the initial value and preserves the exact committed draft", () => {
    const { act, agent, store } = setup(mounted);
    expect(agent.read()).toContain("Value 2");
    expect(act(type({ append: "4" }))).toMatchObject({ ok: true, changed: 'c1/amount type = "24"' });
    expect(agent.act([type({ append: "." }), type({ append: "5" }), type({ append: "0" })])).toMatchObject({
      ok: true,
      changed: 'c1/amount type = "24."\nc1/amount type = "24.5"\nc1/amount type = "24.50"',
    });
    expect(agent.read()).toContain('Value 24.50 — "Value" [c1/amount type = "24.50"]');
    expect(store.get(pad)).toBe("24.50");
    expect(act(type({ backspace: true })).ok).toBe(true);
    expect(store.get(pad)).toBe("24.5");
    expect(act(type({ clear: true })).ok).toBe(true);
    expect(store.get(pad)).toBe("");
    expect(agent.read()).toContain('Fixture "Value" [c1/amount type = ""]');
    expect(act(type({ append: "7" })).ok).toBe(true);
    expect(store.get(pad)).toBe("7");
    expect(agent.act(type("50")).ok).toBe(true);
    expect(store.get(pad)).toBe("50");
  });

  it("rejects invalid edits and replacements atomically without affecting text controls", () => {
    const { act, agent, store } = setup(mounted);
    const before = store.snapshot();
    expect(act([type({ append: "9" }), type({ append: "0" })])).toMatchObject({
      ok: false,
      code: "invalid_value",
      at: 1,
    });
    expect(agent.act(type("50.01"))).toMatchObject({ ok: false, code: "invalid_value", at: 0 });
    expect(agent.act(type("2.123"))).toMatchObject({ ok: false, code: "invalid_value", at: 0 });
    expect(agent.act(type("90", "c1/value"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(agent.act(type({ clear: true }, "c1/pad"))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(store.snapshot()).toEqual(before);
    expect(agent.act(type("backspace", "c1/pad")).ok).toBe(true);
    expect(store.get("home/c1/pad")).toBe("backspace");
    expect(store.get(pad)).toBeUndefined();
  });
});

it("blocks agent edits to a mounted disabled keypad and allows edits after cleanup", () => {
  const { agent, store, runtime } = setup(true);
  const enable = runtime!.registerDisabledPart(pad);
  for (const edit of [type({ append: "4" }), type("5")])
    expect(agent.act(edit)).toMatchObject({ ok: false, code: "disabled", at: 0 });
  expect(runtime!.actionsAt(pad)).toEqual([]);
  expect(store.get(pad)).toBeUndefined();
  enable();
  expect(agent.act(type({ append: "4" })).ok).toBe(true);
  expect(store.get(pad)).toBe("24");
});
