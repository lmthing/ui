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

function setup(mounted: boolean, definitions = defs) {
  const store = createInteractionStore();
  const runtime = mounted
    ? createScreenController({ screen, defs: definitions, store, requireMounted: true })
    : undefined;
  for (const part of [pad, "home/c1/pad", "home/c1/seed"]) runtime?.registerPart(part);
  const agent = createAgentAccess({
    defs: definitions,
    current: () => screen,
    store,
    ...(runtime ? { runtime } : {}),
  });
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

it.each([true, false])(
  "uses a staged numeric set as the first keypad edit's seed (mounted: %s)",
  (mounted) => {
    const { act, agent, store } = setup(mounted, {
      Fixture: {
        ...definition,
        meta: {
          ...definition.meta,
          parts: [...definition.meta.parts!, "seed"],
          actions: { parts: { ...definition.meta.actions?.parts, seed: ["set"] } },
          set: { seed: { prop: "value", min: 0, max: 9, integer: true } },
        },
      },
    });
    const set = { address: "home/c1/seed", action: "set", value: 4 };
    expect(act([set, type({ append: "2" }), type({ append: "0" })])).toMatchObject({
      ok: false,
      code: "invalid_value",
      at: 2,
    });
    expect(store.get(pad)).toBeUndefined();
    expect(agent.read()).toContain("Value 2");
    expect(act([set, type({ append: "2" })])).toMatchObject({ ok: true });
    expect(agent.read()).toContain('Value 42 — "Value" [c1/amount type = "42"]');
    expect(agent.read()).toContain("[c1/seed set = 4]");
  },
);

it("blocks agent edits to a mounted disabled keypad and allows edits after cleanup", () => {
  const { agent, store, runtime } = setup(true);
  expect(agent.act(type("24.50")).ok).toBe(true);
  const enable = runtime!.registerDisabledPart(pad);
  for (const edit of [type({ append: "4" }), type("5")])
    expect(agent.act(edit)).toMatchObject({ ok: false, code: "disabled", at: 0 });
  expect(runtime!.actionsAt(pad)).toEqual([]);
  expect(agent.read()).toContain('Value 24.50 — "Value" [c1/pad type]');
  expect(agent.read()).not.toContain("[c1/amount type");
  expect(store.get(pad)).toBe("24.50");
  enable();
  expect(agent.read()).toContain('[c1/amount type = "24.50"]');
  expect(agent.act(type({ backspace: true })).ok).toBe(true);
  expect(store.get(pad)).toBe("24.5");
});

it("does not publish an invalid keypad replacement as a draft through controller.edit", () => {
  const { agent, store, runtime } = setup(true);
  expect(agent.act(type("24.50")).ok).toBe(true);
  expect(runtime!.edit(pad, "51")).toMatchObject({ ok: false, code: "invalid_value" });
  expect(store.get(pad)).toBe("24.50");
  expect(store.get(`${pad}/$draft`)).toBeUndefined();
  expect(agent.read()).toContain('Value 24.50 — "Value" [c1/amount type = "24.50"]');
});
