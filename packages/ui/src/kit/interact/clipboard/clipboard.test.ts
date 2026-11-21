import { afterEach, expect, it, vi } from "vitest";
import { components, planAct, type Definition } from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createInteractionStore,
  createScreenController,
  type ClipboardWriter,
} from "../index";
import { copyStatusKey } from "./index";

const screen = { id: "home", components: [{ id: "c1", c: "Button", label: "Copy" }] };
const step = { address: "home/c1/root", action: "copy", value: "  fixture\ntext  " };
const key = copyStatusKey(step.address);
function definitions(confirm = false): Record<string, Definition> {
  const button = components.Button!;
  return {
    Button: {
      ...button,
      meta: {
        ...button.meta,
        actions: { parts: { root: ["copy"] } },
        ...(confirm ? { confirmParts: ["root"] } : {}),
      },
    },
  };
}
function setup(writeClipboard?: ClipboardWriter, confirm = false) {
  return createScreenController({ screen, defs: definitions(confirm), writeClipboard });
}
function deferred() {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
afterEach(() => vi.unstubAllGlobals());

it("plans and admits copy without echoing or persisting its text", async () => {
  const write = vi.fn();
  const runtime = setup(write);
  expect(planAct(screen, definitions(), {}, [step])).toMatchObject({
    ok: true,
    values: {},
    changed: ["c1 copy"],
    links: [],
  });
  expect(runtime.actionsAt(step.address)).toEqual(["copy"]);
  expect(runtime.act(step, { dryRun: true })).toMatchObject({ ok: true, dryRun: true, changed: "c1 copy" });
  expect(runtime.act([step, { ...step, address: "missing" }])).toMatchObject({ ok: false, at: 1 });
  expect(runtime.act({ ...step, value: 42 })).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.act({ ...step, action: "press" })).toMatchObject({ ok: false, code: "not_actionable" });
  expect(write).not.toHaveBeenCalled();
  expect(runtime.store.snapshot()).toEqual({});
  expect(runtime.act(step)).toMatchObject({ ok: true, changed: "c1 copy" });
  expect(write).toHaveBeenCalledExactlyOnceWith(step.value);
  await Promise.resolve();
  expect(runtime.store.get(key)).toBe(true);
  expect(JSON.stringify(runtime.store.snapshot())).not.toContain("fixture");
});

it("uses the bound browser clipboard and reports unavailable hosts", async () => {
  vi.stubGlobal("navigator", {});
  const unavailable = setup();
  expect(unavailable.actionsAt(step.address)).toEqual([]);
  expect(unavailable.act(step)).toMatchObject({ ok: false, code: "clipboard_unavailable" });

  const writeText = vi.fn(function (this: unknown) {
    expect(this).toBe(clipboard);
    return Promise.resolve();
  });
  const clipboard = { writeText };
  vi.stubGlobal("navigator", { clipboard });
  const runtime = setup();
  runtime.act(step);
  expect(writeText).toHaveBeenCalledExactlyOnceWith(step.value);
  await Promise.resolve();
  expect(runtime.store.get(key)).toBe(true);
});

it("only reports a completed write for the latest attempt and forgets attempts on reset", async () => {
  const old = deferred(),
    next = deferred(),
    pending = deferred();
  const write = vi
    .fn()
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(next.promise)
    .mockReturnValueOnce(pending.promise);
  const runtime = setup(write);
  runtime.act(step);
  runtime.act({ ...step, value: "Newer" });
  expect(runtime.store.get(key)).not.toBe(true);
  old.resolve();
  await Promise.resolve();
  expect(runtime.store.get(key)).not.toBe(true);
  next.reject();
  await Promise.resolve();
  expect(runtime.store.get(key)).toBe(false);
  runtime.act(step);
  runtime.reset();
  pending.resolve();
  await Promise.resolve();
  expect(runtime.store.get(key)).toBeUndefined();
  expect(write).toHaveBeenCalledTimes(3);
});

it("copies a confirmable part only after an accepted, valid batch", async () => {
  const write = vi.fn();
  const runtime = setup(write, true);
  const accept = { address: "confirm/confirm", action: "press" };
  expect(runtime.act([step, accept, { ...step, address: "missing" }])).toMatchObject({ ok: false, at: 2 });
  expect(runtime.act(step)).toMatchObject({ ok: true });
  expect(runtime.confirmation?.source).toBe(step.address);
  expect(runtime.press("confirm/cancel")).toMatchObject({ ok: true });
  expect(write).not.toHaveBeenCalled();
  expect(runtime.act([step, accept])).toMatchObject({ ok: true });
  await Promise.resolve();
  expect(write).toHaveBeenCalledExactlyOnceWith(step.value);
  expect(runtime.store.get(key)).toBe(true);
});

it("requires a mounted, enabled target and does not write from a preview", () => {
  const writeClipboard = vi.fn();
  const options = { screen, defs: definitions(), writeClipboard, requireMounted: true };
  const preview = createScreenController({ ...options, interactive: false });
  expect(preview.act(step)).toMatchObject({ ok: false, code: "not_interactive" });
  const runtime = createScreenController(options);
  expect(runtime.act(step)).toMatchObject({ ok: false, code: "not_mounted" });
  const unmount = runtime.registerPart(step.address);
  const enable = runtime.registerDisabledPart(step.address);
  expect(runtime.act(step)).toMatchObject({ ok: false, code: "disabled" });
  expect(writeClipboard).not.toHaveBeenCalled();
  enable();
  expect(runtime.act(step)).toMatchObject({ ok: true });
  unmount();
  expect(writeClipboard).toHaveBeenCalledOnce();
});

it("copies through detached agent access without logging text", async () => {
  const writeClipboard = vi.fn(),
    store = createInteractionStore();
  const agent = createAgentAccess({ defs: definitions(), store, current: () => screen, writeClipboard });
  expect(agent.read()).toContain("[c1 copy]");
  expect(agent.act(step)).toMatchObject({ ok: true, changed: "c1 copy" });
  expect(agent.log()).toEqual([{ address: step.address, action: "copy", at: expect.any(Number) }]);
  await Promise.resolve();
  expect(writeClipboard).toHaveBeenCalledExactlyOnceWith(step.value);
  expect(store.get(key)).toBe(true);
});

it("retains a detached agent confirmation across separate calls", async () => {
  const writeClipboard = vi.fn(),
    store = createInteractionStore();
  const agent = createAgentAccess({ defs: definitions(true), store, current: () => screen, writeClipboard });
  expect(agent.act(step)).toMatchObject({ ok: true });
  expect(agent.read()).toContain("[confirm/confirm press]");
  expect(writeClipboard).not.toHaveBeenCalled();
  expect(agent.act({ address: "confirm/confirm", action: "press" })).toMatchObject({ ok: true });
  await Promise.resolve();
  expect(writeClipboard).toHaveBeenCalledExactlyOnceWith(step.value);
  expect(store.get(key)).toBe(true);
});
