import { expect, it, vi } from "vitest";
import { z } from "zod";
import { screenId, type Definition } from "@lmthing/ui/catalog";
import { createParentGate, createScreenController } from "@lmthing/ui/kit";

const def = {
  meta: {
    id: "AdmissionFixture",
    group: "action",
    purpose: "Request admission.",
    pick: "Request admission.",
    region: "body",
    weight: 1,
    tier: "ok",
    realPath: "The host manages an expiring gate.",
    actions: { parts: { enter: ["press"] } },
  },
  props: z.strictObject({ goto: screenId }),
  fallback: () => ({ goto: "restricted" }),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { [def.meta.id]: def };
const screen = {
  id: "home",
  components: [{ id: "gate", c: def.meta.id, goto: "restricted" }],
};
const protectedScreen = { ...screen, id: "restricted", title: "Private destination" };

it("does not interpret a protected screen named sheet as the local overlay route", () => {
  const gate = createParentGate({ destinations: ["sheet"], ttlMs: 100, verify: () => true });
  const controller = createScreenController({
    screen: { ...protectedScreen, id: "sheet" },
    defs,
    parentGate: gate,
  });
  expect(gate.allows("sheet")).toBe(false);
  expect(controller.admitted).toBe(false);
  expect(controller.read()).not.toContain("Private destination");
  expect(controller.snapshotScreen().components).toEqual([]);
  expect(controller.act({ address: "gate/enter", action: "press" }).ok).toBe(false);
  const overlay = { ...def, meta: { ...def.meta, id: "Sheet" }, props: z.strictObject({}) };
  const host = createScreenController({
    screen: {
      id: "home",
      components: [
        { ...screen.components[0]!, goto: "sheet" },
        { id: "drawer", c: "Sheet" },
      ],
    },
    defs: { ...defs, Sheet: overlay },
    parentGate: gate,
  });
  expect(host.press("gate/enter").ok).toBe(true);
  expect(host.openSheet).toBe("drawer");
  expect(gate.allows("sheet")).toBe(false);
});

it("requires live mounted hold or host-verified math, and rechecks destination admission at expiry", () => {
  vi.useFakeTimers();
  try {
    let held = false;
    const gate = createParentGate({
      destinations: ["restricted", "other"],
      ttlMs: 100,
      verify: ({ address, proof }) =>
        address === "home/gate/challenge" && (proof.kind === "hold" ? held : proof.answer === "73"),
    });
    const onLink = vi.fn();
    const source = createScreenController({ screen, defs, parentGate: gate, onLink, requireMounted: true });
    const destination = createScreenController({ screen: protectedScreen, defs, parentGate: gate });
    const refresh = vi.fn();
    destination.store.subscribe(refresh);
    destination.mount();
    source.registerPart("gate/enter");
    expect(source.bindParentGatePart("gate/challenge", "restricted")).toBeUndefined();
    const unmount = source.registerPart("gate/challenge");
    const submit = source.bindParentGatePart("gate/challenge", "restricted")!;
    expect(source.read()).not.toContain("[gate/enter");
    expect(source.press("gate/enter").ok).toBe(false);
    expect(source.act({ address: "gate/challenge", action: "type", value: "73" }, { agent: true }).ok).toBe(
      false,
    );
    expect(destination.read()).not.toContain("Private destination");
    expect(destination.snapshotScreen().components).toEqual([]);
    expect(submit({ kind: "hold" })).toBe(false);
    expect(submit({ kind: "math", answer: "72" })).toBe(false);
    expect(submit({ kind: "math", answer: "73" })).toBe(true);
    expect(gate.allows("other")).toBe(false);
    expect(source.read()).not.toContain("73");
    expect(source.read()).toContain("[gate/enter press→restricted !needs-ok]");
    expect(source.press("gate/enter").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("restricted", "home/gate/enter");
    expect(destination.read()).toContain("Private destination");
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(destination.snapshotScreen().components).toEqual([]);
    expect(destination.act({ address: "gate/enter", action: "press" }).ok).toBe(false);
    held = true;
    unmount();
    source.registerPart("gate/challenge");
    expect(submit({ kind: "hold" })).toBe(false);
    const hold = source.bindParentGatePart("gate/challenge", "restricted")!;
    expect(hold({ kind: "hold" })).toBe(true);
    gate.revoke("restricted");
    expect(destination.admitted).toBe(false);
    source.dispose();
    destination.dispose();
  } finally {
    vi.useRealTimers();
  }
});
