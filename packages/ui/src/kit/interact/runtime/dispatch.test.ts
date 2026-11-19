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
    parts: ["root", "value", "pad", "note"],
    actions: { parts: { pad: ["type"], note: ["type"] } },
  },
  props: z.strictObject({
    label: text(20),
    value: z.number().nonnegative().optional(),
    max: z.number().optional(),
    decimals: z.int().nonnegative().optional(),
  }),
  fallback: () => ({ label: "Value" }),
  examples: [],
  probes: [],
};
const defs = { Fixture: definition };
const screen: ScreenLike = {
  id: "home",
  components: [{ id: "c1", c: "Fixture", label: "Value", value: 2, max: 50, decimals: 2 }],
};
const pad = "home/c1/pad";
const type = (value: unknown, address = pad) => ({ address, action: "type", value });

function setup(mounted: boolean) {
  const store = createInteractionStore();
  const runtime = mounted ? createScreenController({ screen, defs, store, requireMounted: true }) : undefined;
  for (const part of [pad, "home/c1/note"]) runtime?.registerPart(part);
  const agent = createAgentAccess({ defs, current: () => screen, store, ...(runtime ? { runtime } : {}) });
  return { act: runtime?.act ?? agent.act, agent, store };
}

describe.each([true, false])("numeric typing with controller: %s", (mounted) => {
  it("edits the initial value and preserves the exact committed draft", () => {
    const { act, agent, store } = setup(mounted);
    expect(act(type({ append: "4" }))).toMatchObject({ ok: true, changed: 'c1/pad type = "24"' });
    expect(agent.act([type({ append: "." }), type({ append: "5" }), type({ append: "0" })])).toMatchObject({
      ok: true,
      changed: 'c1/pad type = "24."\nc1/pad type = "24.5"\nc1/pad type = "24.50"',
    });
    expect(agent.read()).toContain('[c1/pad type = "24.50"]');
    expect(store.get(pad)).toBe("24.50");
    expect(act(type({ backspace: true })).ok).toBe(true);
    expect(store.get(pad)).toBe("24.5");
    expect(act(type({ clear: true })).ok).toBe(true);
    expect(store.get(pad)).toBe("");
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
    expect(agent.act(type({ clear: true }, "c1/note"))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(store.snapshot()).toEqual(before);
    expect(agent.act(type("backspace", "c1/note")).ok).toBe(true);
    expect(store.get("home/c1/note")).toBe("backspace");
    expect(store.get(pad)).toBeUndefined();
  });
});
