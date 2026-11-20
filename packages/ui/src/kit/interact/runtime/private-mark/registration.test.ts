import { expect, it, vi } from "vitest";
import { z } from "zod";
import { type Definition } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type InteractionStore } from "@lmthing/ui/kit";

const fixture = {
  meta: {
    id: "Fixture",
    group: "input",
    purpose: "Capture a mark",
    pick: "Capture a mark",
    region: "body",
    tier: "phone",
    weight: 1,
    realPath: "Local capture",
    actions: { parts: { pad: ["set"], other: ["set"] } },
  },
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

const address = "home/c1/pad";
const own = "local-ref";
const defs = { Fixture: fixture };
const screen = { id: "home", components: [{ id: "c1", c: "Fixture" }] };
const controllerForPad = (store?: InteractionStore) =>
  createScreenController({
    defs,
    screen,
    store,
    requireMounted: true,
  });

it("permits only an opaque reference accepted by the registered host, through normal dispatch", () => {
  const controller = controllerForPad();
  const accepts = vi.fn((ref) => ref === own);
  const pad = controller.registerPrivateMarkPart(address, accepts);
  const direct = { address, action: "set", value: own };
  expect(controller.act(direct, { agent: true, dryRun: true })).toMatchObject({ ok: false });
  expect(controller.act(direct)).toMatchObject({ ok: false });
  expect(accepts).not.toHaveBeenCalled();
  pad.capture(own);
  expect(controller.store.get(address)).toBeUndefined();
  const unmount = controller.registerPart(address);
  pad.capture("not-in-current-document");
  expect(controller.store.get(address)).toBeUndefined();
  pad.capture(own);
  expect(controller.store.get(address)).toBe(own);
  expect(controller.read()).not.toContain(own);
  expect(controller.read()).not.toContain("c1/pad set");
  expect(controller.read()).toContain("[c1/other set]");
  unmount();
  pad.unregister();
  expect(controller.read()).not.toContain(own);
  controller.dispose();
  const replacement = controllerForPad(controller.store);
  expect(replacement.read()).not.toContain(own);
  expect(replacement.actionsAt(address)).toEqual([]);
  replacement.registerPart(address);
  expect(replacement.act(direct)).toMatchObject({ ok: false, code: "not_actionable" });
  replacement.dispose();
  const detached = createAgentAccess({ defs, store: controller.store, current: () => screen });
  expect(detached.read()).not.toContain("c1/pad set");
  expect(detached.read()).not.toContain(own);
});

it("rejects stale callbacks, unavailable adapters and resolver failures", () => {
  const controller = controllerForPad();
  controller.registerPart(address);
  const old = controller.registerPrivateMarkPart(address, () => true);
  const unavailable = controller.registerPrivateMarkPart(address);
  old.unregister();
  old.capture(own);
  unavailable.capture(own);
  expect(controller.store.get(address)).toBeUndefined();
  const failed = controller.registerPrivateMarkPart(address, () => {
    throw new Error("Device data unavailable");
  });
  expect(() => failed.capture(own)).not.toThrow();
  expect(controller.store.get(address)).toBeUndefined();
  failed.unregister();
  old.capture(own);
  expect(controller.store.get(address)).toBeUndefined();
  expect(controller.actionsAt(address)).toEqual([]);
  expect(controller.act({ address, action: "set", value: own })).toMatchObject({ ok: false });
  controller.dispose();
});
