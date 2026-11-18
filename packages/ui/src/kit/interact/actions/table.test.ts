import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { actionTable, handlerFor } from "./table";
import { createScreenController } from "../index";
import { components, confirmLabel, type Definition } from "@lmthing/ui/catalog";
it("dispatches all existing action names and safely handles unknown names", () => {
  expect(Object.keys(actionTable)).toEqual([
    "press",
    "play",
    "pause",
    "seek",
    "select",
    "type",
    "set",
    "toggle",
    "check",
    "increment",
    "decrement",
    "start",
    "stop",
    "send",
    "dismiss",
    "swipe",
  ]);
  for (const name of Object.keys(actionTable)) expect(handlerFor(name)).toBe(actionTable[name]);
  expect(typeof handlerFor("toString")).toBe("function");
  const runtime = createScreenController({
    screen: { id: "test", components: [{ id: "c1", c: "Button", label: "Next" }] },
    defs: components,
  });
  expect(runtime.act({ address: "c1", action: "toString" })).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(runtime.store.snapshot()).toEqual({});
});

const fixture: Definition = {
  ...components.Button!,
  meta: {
    ...components.Button!.meta,
    id: "ConfirmFixture",
    parts: ["cancel", "other"],
    confirmParts: ["cancel"],
    items: { key: "items", parts: ["root", "cancel"], prefix: "i" },
    actions: {
      parts: { cancel: ["press", "toggle", "select", "dismiss"], other: ["press"] },
      items: { root: ["press"], cancel: ["press", "toggle", "select"] },
    },
  },
  props: z.strictObject({
    confirm: z.string().optional(),
    items: z
      .array(z.strictObject({ label: z.string(), goto: z.string().optional() }))
      .min(1)
      .max(2),
  }),
};
function confirming(requireMounted = false) {
  const onAction = vi.fn(),
    onLink = vi.fn();
  const runtime = createScreenController({
    screen: {
      id: "test",
      components: [{ id: "c1", c: fixture.meta.id, items: [{ label: "Item", goto: "next" }] }],
    },
    defs: { ...components, [fixture.meta.id]: fixture },
    requireMounted,
    onAction,
    onLink,
  });
  return { runtime, onAction, onLink };
}
describe("declared confirm parts", () => {
  it.each(["c1/cancel", "c1/i1/cancel"])("defers %s and runs its original press once accepted", (address) => {
    const { runtime, onAction } = confirming();
    expect(runtime.press(address)).toMatchObject({ ok: true });
    expect(runtime.confirmation).toMatchObject({ message: confirmLabel, source: `test/${address}` });
    expect(runtime.read()).toContain("[confirm/confirm press]");
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `test/${address}`, action: "press" });
    expect(runtime.confirmation).toBeUndefined();
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: false });
  });
  it.each(["c1/cancel", "c1/i1/cancel"])("cancels %s without changing its value", (address) => {
    const { runtime, onAction } = confirming();
    runtime.store.set(`test/${address}`, false);
    expect(runtime.act({ address, action: "toggle" })).toMatchObject({ ok: true });
    expect(runtime.store.get(`test/${address}`)).toBe(false);
    expect(runtime.press("confirm/cancel")).toMatchObject({ ok: true });
    expect(runtime.store.get(`test/${address}`)).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });
  it.each(["c1/cancel", "c1/i1/cancel"])("preserves the action and value at %s", (address) => {
    const { runtime, onAction } = confirming();
    const step = { address, action: "select", value: "review" };
    expect(runtime.act(step)).toMatchObject({ ok: true });
    expect(runtime.store.get(`test/${address}`)).toBeUndefined();
    expect(runtime.act({ address: "confirm/confirm", action: "press", value: true })).toMatchObject({
      ok: false,
    });
    expect(runtime.confirmation).toBeDefined();
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: true });
    expect(runtime.store.get(`test/${address}`)).toBe("review");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ ...step, address: `test/${address}` });
  });
});
describe("confirmation state", () => {
  it("runs unlisted component and item parts directly", () => {
    const { runtime, onAction, onLink } = confirming();
    runtime.press("c1/other");
    runtime.press("c1/i1");
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("next", "test/c1/i1");
  });
  it("keeps batches atomic and dry runs without a pending sheet or state", () => {
    const { runtime, onAction } = confirming();
    const step = { address: "c1/cancel", action: "toggle" };
    const before = runtime.store.snapshot();
    expect(runtime.act(step, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
    expect(runtime.store.snapshot()).toEqual(before);
    expect(runtime.confirmation).toBeUndefined();
    expect(
      runtime.act([
        step,
        { address: "confirm/confirm", action: "press" },
        { address: "missing", action: "press" },
      ]),
    ).toMatchObject({ ok: false, at: 2 });
    expect(runtime.store.snapshot()).toEqual(before);
    expect(onAction).not.toHaveBeenCalled();
  });
  it("waits before dismissing and resumes a control unmounted by its confirmation sheet", () => {
    const { runtime, onAction } = confirming(true);
    const unregister = runtime.registerPart("c1/cancel");
    runtime.act({ address: "c1/cancel", action: "dismiss" });
    unregister();
    expect(runtime.snapshotScreen().components).toHaveLength(1);
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: true });
    expect(runtime.snapshotScreen().components).toHaveLength(0);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "test/c1/cancel", action: "dismiss" });
  });
});
it("confirms an item root by its declared part, not by its stamped id", () => {
  const { runtime } = confirming();
  runtime.defs[fixture.meta.id] = { ...fixture, meta: { ...fixture.meta, confirmParts: ["root"] } };
  runtime.press("c1/i1");
  expect(runtime.confirmation?.source).toBe("test/c1/i1");
});
it("prepares and plays confirmable media only after accepting", () => {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const open = vi.fn(() => session);
  const runtime = createScreenController({
    screen: {
      id: "test",
      components: [{ id: "p1", c: "Player", media: "lib:fixture", title: "Item", seconds: 30 }],
    },
    defs: {
      ...components,
      Player: { ...components.Player!, meta: { ...components.Player!.meta, confirmParts: ["play"] } },
    },
    media: { open },
  });
  runtime.press("p1/play");
  expect(open).not.toHaveBeenCalled();
  expect(runtime.store.get("test/p1/play")).toBeUndefined();
  runtime.press("confirm/cancel");
  expect(open).not.toHaveBeenCalled();
  runtime.press("p1/play");
  expect(runtime.press("confirm/confirm")).toMatchObject({ ok: true });
  expect(open).toHaveBeenCalledOnce();
  expect(session.play).toHaveBeenCalledOnce();
  expect(runtime.store.get("test/p1/play")).toBe(true);
});
