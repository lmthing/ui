import { afterEach, expect, it, vi } from "vitest";
import { planAct, type Definition } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type AuthenticateReveal } from "@lmthing/ui/kit";
import { createPreviewController } from "../../../../../apps/gallery/app/draw";
import { defs, entry, fakeSecret, revealStep, screen } from "./fixture";

function deferredAuth() {
  let resolve!: (result: Awaited<ReturnType<AuthenticateReveal>>) => void;
  const pending = new Promise<Awaited<ReturnType<AuthenticateReveal>>>((done) => {
    resolve = done;
  });
  return { authenticate: vi.fn<AuthenticateReveal>(() => pending), resolve };
}

function setup(authenticateReveal?: AuthenticateReveal, interactive = true) {
  const onLink = vi.fn(),
    onChange = vi.fn(),
    onAction = vi.fn();
  const runtime = createScreenController({
    defs,
    screen,
    authenticateReveal,
    interactive,
    requireMounted: true,
    onLink,
    onChange,
    onAction,
  });
  const agent = createAgentAccess({ defs, current: () => screen, store: runtime.store, runtime });
  return { runtime, agent, onLink, onChange, onAction };
}

const address = revealStep.address;
afterEach(() => vi.useRealTimers());

it("admits only one local press, prompts once, and expires a grant without publishing it", async () => {
  vi.useFakeTimers();
  const { authenticate, resolve } = deferredAuth();
  const { runtime, agent, onChange, onLink, onAction } = setup(authenticate);
  expect(runtime.act(revealStep)).toMatchObject({ ok: false });
  runtime.registerPart(address);
  expect(runtime.revealStatus(address)).toBe("masked");
  expect(agent.read()).toContain("[f1/reveal press !needs-ok]");
  expect(agent.read()).not.toContain("elsewhere");
  expect(agent.read()).toContain("(secret)");
  expect(agent.read()).not.toContain(fakeSecret);
  expect(agent.act(revealStep, { agent: false })).toMatchObject({ ok: false });
  expect(planAct(screen, defs, {}, [revealStep])).toMatchObject({ ok: false });
  expect(runtime.act([revealStep, { address: "b1", action: "press" }])).toMatchObject({ ok: false });
  expect(runtime.act(revealStep, undefined, Symbol())).toMatchObject({ ok: false });
  expect(runtime.act({ ...revealStep, value: fakeSecret })).toMatchObject({ ok: false });
  expect(runtime.act(revealStep, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
  expect(authenticate).not.toHaveBeenCalled();
  const changed = vi.fn();
  const unsubscribe = runtime.subscribeReveal(changed);
  expect(runtime.press(address)).toMatchObject({ ok: true, changed: "" });
  expect(runtime.press(address)).toMatchObject({ ok: true });
  expect(authenticate).toHaveBeenCalledExactlyOnceWith({ address, tier: "ok" });
  expect(runtime.revealStatus(address)).toBe("pending");
  resolve("approved");
  await vi.advanceTimersByTimeAsync(14_999);
  expect(runtime.revealStatus(address)).toBe("revealed");
  expect(runtime.revealStatus("home/f1/r1/reveal")).toBe("masked");
  expect(agent.read()).not.toContain(fakeSecret);
  expect(agent.log()).toEqual([]);
  expect(runtime.store.snapshot()).toEqual({});
  expect(onLink).not.toHaveBeenCalled();
  expect(onAction).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(runtime.revealStatus(address)).toBe("masked");
  expect(changed).toHaveBeenCalledTimes(3);
  unsubscribe();
  runtime.dispose();
});

it("fails closed for denied, unavailable, throwing, missing and noninteractive hosts", async () => {
  for (const source of ["denied", "unavailable", "throws", "missing", "preview"] as const) {
    const authenticateReveal = vi.fn<AuthenticateReveal>(async () => {
      if (source === "throws") throw new Error(fakeSecret);
      return source === "denied" ? "denied" : "unavailable";
    });
    const { runtime, agent } = setup(
      source === "missing" ? undefined : authenticateReveal,
      source !== "preview",
    );
    runtime.registerPart(address);
    expect(runtime.press(address).ok).toBe(source !== "preview");
    await Promise.resolve();
    expect(runtime.revealStatus(address)).toBe(
      source === "denied" ? "denied" : source === "preview" ? "masked" : "unavailable",
    );
    if (source === "missing" || source === "preview") expect(authenticateReveal).not.toHaveBeenCalled();
    expect(agent.read()).not.toContain(fakeSecret);
    runtime.dispose();
  }
});

it.each(["unmount", "replace", "reset", "dispose", "cover"] as const)(
  "ignores stale approval after %s",
  async (invalidate) => {
    const { authenticate, resolve } = deferredAuth();
    const { runtime } = setup(authenticate);
    const unregister = runtime.registerPart(address);
    expect(runtime.act(revealStep).ok).toBe(true);
    if (invalidate === "unmount") unregister();
    if (invalidate === "replace") runtime.registerPart(address);
    if (invalidate === "reset") runtime.reset();
    if (invalidate === "dispose") runtime.dispose();
    if (invalidate === "cover") {
      expect(runtime.press("b1").ok).toBe(false);
      runtime.registerPart("b1");
      expect(runtime.press("b1").ok).toBe(true);
      expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    }
    resolve("approved");
    await Promise.resolve();
    expect(runtime.revealStatus(address)).toBe("masked");
    runtime.dispose();
  },
);

it("scopes row grants and makes a second press hide the active reveal", async () => {
  const authenticate = vi.fn<AuthenticateReveal>(async () => "approved");
  const { runtime } = setup(authenticate);
  const row = "home/f1/r1/reveal";
  runtime.registerPart(row);
  expect(runtime.press(row).ok).toBe(true);
  await Promise.resolve();
  expect(runtime.revealStatus(row)).toBe("revealed");
  expect(runtime.revealStatus(address)).toBe("masked");
  expect(runtime.press(row).ok).toBe(true);
  expect(runtime.revealStatus(row)).toBe("masked");
  expect(authenticate).toHaveBeenCalledExactlyOnceWith({ address: row, tier: "ok" });
  runtime.dispose();
});

it.each([false, true])(
  "uses the deterministic gallery host with a selection binding: %s",
  async (selectionBound) => {
    const { id: _id, c: _c, ...input } = entry;
    const fixture = defs.RevealFixture;
    const def: Definition = selectionBound
      ? {
          ...fixture,
          meta: {
            ...fixture.meta,
            selectionBinding: { component: "Table", check: "pick", all: "all", requireSelection: true },
          },
        }
      : fixture;
    const runtime = createPreviewController(def, input, "example", { state: "filled" })!;
    expect(runtime.read()).toContain("[c1/reveal press !needs-ok]");
    expect(runtime.press("example/c1/reveal").ok).toBe(true);
    await Promise.resolve();
    expect(runtime.revealStatus("example/c1/reveal")).toBe("revealed");
    expect(runtime.read()).not.toContain(fakeSecret);
    runtime.dispose();
  },
);
