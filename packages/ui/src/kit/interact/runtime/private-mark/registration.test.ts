import { expect, it, vi } from "vitest";
import { z } from "zod";
import { hostOnlyParts, planAct, readScreen, type Definition } from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createInteractionStore,
  createScreenController,
  type InteractionStore,
} from "@lmthing/ui/kit";

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
    ...hostOnlyParts({ parts: ["pad"] }),
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
const writeMark = { address, action: "set", value: own };
const writeOther = { address: "c1/other", action: "set", value: "public-value" };
const controllerForPad = (store?: InteractionStore) =>
  createScreenController({
    defs,
    screen,
    store,
    requireMounted: true,
  });

it("rejects host-only writes before mounting, even in a batch or dry run", () => {
  const store = createInteractionStore();
  const agent = createAgentAccess({ defs, store, current: () => screen });
  const unavailable = { ok: false, code: "not_actionable", at: 0 };
  const relative = { ...writeMark, address: "c1/pad" };
  const controller = createScreenController({ defs, screen, store });
  expect(controller.act(writeMark)).toMatchObject(unavailable);
  expect(controller.act(writeMark, undefined, Symbol())).toMatchObject(unavailable);
  expect(controller.actionsAt(address)).toEqual([]);
  expect(planAct(screen, defs, {}, [writeMark])).toMatchObject(unavailable);
  expect(planAct(screen, defs, {}, [writeMark], null, "controller")).toMatchObject(unavailable);
  expect(
    Reflect.apply(planAct, undefined, [
      screen,
      defs,
      {},
      [writeMark],
      null,
      "controller",
      undefined,
      relative,
    ]),
  ).toMatchObject(unavailable);
  expect(agent.act(relative, { dryRun: true })).toMatchObject(unavailable);
  expect(agent.act([writeOther, writeMark])).toMatchObject({ ...unavailable, at: 1 });
  expect(store.snapshot()).toEqual({});
  expect(agent.log()).toEqual([]);
  expect(readScreen(screen, defs)).not.toContain("[c1/pad set]");
  expect(agent.read()).toContain("[c1/other set]");
  expect(agent.act(writeOther)).toMatchObject({ ok: true });
  expect(store.get("home/c1/other")).toBe(writeOther.value);
  controller.dispose();
});

it("rejects a cold write through the detached confirmation runtime", () => {
  const meta = {
    ...fixture.meta,
    confirmParts: ["clear"],
    successActions: ["clear.press"],
    actions: { parts: { ...fixture.meta.actions.parts, clear: ["press"] } },
  } satisfies Definition["meta"] & ReturnType<typeof hostOnlyParts>;
  const confirmationDefs = { Fixture: { ...fixture, meta } };
  const store = createInteractionStore();
  const agent = createAgentAccess({ defs: confirmationDefs, store, current: () => screen });
  const clear = { address: "c1/clear", action: "press" };
  expect(agent.act([writeMark, clear])).toMatchObject({ ok: false, code: "not_actionable", at: 0 });
  expect(store.snapshot()).toEqual({});
  expect(agent.act(clear)).toMatchObject({ ok: true });
  expect(agent.read()).toContain("[confirm/confirm press]");
});

it("uses item declarations without blocking a component part of the same name", () => {
  const rowDef = {
    ...fixture,
    props: z.strictObject({ rows: z.array(z.strictObject({})) }),
    meta: {
      ...fixture.meta,
      ...hostOnlyParts({ items: ["pad"] }),
      items: { key: "rows", parts: ["pad"] },
      actions: { ...fixture.meta.actions, items: { pad: ["set"] } },
    },
  } satisfies Definition;
  const rows = { ...screen, components: [{ ...screen.components[0]!, rows: [{}] }] };
  const rowDefs = { Fixture: rowDef };
  const store = createInteractionStore();
  const agent = createAgentAccess({ defs: rowDefs, store, current: () => rows });
  expect(agent.act({ ...writeMark, address: "home/c1/r1/pad" })).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(agent.read()).not.toContain("[c1/r1/pad set]");
  expect(agent.act(writeMark)).toMatchObject({ ok: true });
});

it("permits only an opaque reference accepted by the registered host, through normal dispatch", () => {
  const controller = controllerForPad();
  const accepts = vi.fn((ref) => ref === own);
  const pad = controller.registerPrivateMarkPart(address, accepts);
  const direct = writeMark;
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
  expect(detached.act({ ...writeMark, value: "forged" })).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  const legacyDefs = { Fixture: { ...fixture, meta: { ...fixture.meta, ...hostOnlyParts({}) } } };
  const legacy = createAgentAccess({ defs: legacyDefs, store: controller.store, current: () => screen });
  expect(legacy.act({ ...writeMark, value: "forged" })).toMatchObject({ ok: false, code: "not_actionable" });
  const catalogRead = readScreen(screen, legacyDefs, controller.store.snapshot());
  expect(catalogRead).not.toContain(own);
  expect(catalogRead).not.toContain("[c1/pad set");
  expect(catalogRead).toContain("[c1/other set]");
  expect(controller.store.get(address)).toBe(own);
  expect(detached.log()).toEqual([]);
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
