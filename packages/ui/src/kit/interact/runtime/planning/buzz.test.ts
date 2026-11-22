import { expect, it, vi } from "vitest";
import { z } from "zod";
import { buzzKey, type Definition, type ScreenLike, type Values } from "../../../../catalog";
import { createScreenController } from "../../index";

const def: Definition = {
  meta: {
    id: "BuzzFixture",
    group: "action",
    purpose: "Buzz",
    pick: "Buzz",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "On contact",
    items: { key: "players", parts: ["buzz", "name"] },
    actions: { items: { buzz: ["press"] }, parts: { reset: ["press"] } },
    successActions: ["buzz.press", "reset.press"],
    readSuccess: true,
    buzz: { press: "buzz", reset: "reset" },
    read: (input) => {
      const round = (input as Values)[buzzKey];
      return round ? [JSON.stringify(round)] : [];
    },
  },
  props: z.strictObject({ players: z.array(z.strictObject({ name: z.string() })) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const players = [{ name: "A" }, { name: "B" }, { name: "C" }];
const screen: ScreenLike = { id: "s", components: [{ id: "pad", c: def.meta.id, players }] };
const defs = { [def.meta.id]: def };
const step = (address: string) => ({ address, action: "press" });

it("uses a separate injectable clock, projects only deltas, and unlocks on reset", () => {
  const touchNow = vi.fn().mockReturnValueOnce(12.25).mockReturnValueOnce(15.5).mockReturnValue(20);
  let wall = 50000;
  const runtime = createScreenController({ screen, defs, touchNow, now: () => wall });
  const live = () => runtime.liveControls(def.meta, { players }, "pad")[buzzKey];
  expect(runtime.act(step("pad/r2/buzz"), { dryRun: true }).ok).toBe(true);
  expect(touchNow).not.toHaveBeenCalled();
  expect(live()).toBeUndefined();
  expect(runtime.act(step("pad/r2/buzz")).ok).toBe(true);
  wall = 10;
  expect(runtime.act(step("pad/r1/buzz")).ok).toBe(true);
  expect(touchNow).toHaveBeenCalledTimes(2);
  expect(live()).toEqual({ winner: "r2", deltas: { r2: 0, r1: 3.25 } });
  expect(runtime.canPress("pad/r2/buzz")).toBe(false);
  expect(runtime.act(step("pad/r2/buzz")).ok).toBe(false);
  expect(runtime.canPress("pad/r3/buzz")).toBe(true);
  expect(runtime.read()).toContain('{"winner":"r2","deltas":{"r2":0,"r1":3.25}}');
  expect(runtime.snapshotScreen().components[0]).toEqual({
    ...screen.components[0],
    state: "success",
  });
  expect(runtime.act(step("pad/reset")).ok).toBe(true);
  expect(live()).toBeUndefined();
  expect(runtime.snapshotScreen().components[0]?.state).toBeUndefined();
  expect(runtime.act(step("pad/r1/buzz")).ok).toBe(true);
  expect(live()).toEqual({ winner: "r1", deltas: { r1: 0 } });
});

it("omits disabled buzz offers from the agent's reading", () => {
  const runtime = createScreenController({ screen, defs });
  const unregister = runtime.registerDisabledPart("pad/r2/buzz");
  expect(runtime.read()).not.toContain("[pad/r2/buzz press]");
  expect(runtime.read()).toContain("[pad/r1/buzz press]");
  expect(runtime.act(step("pad/r2/buzz"))).toMatchObject({ ok: false, code: "disabled" });
  unregister();
  expect(runtime.read()).toContain("[pad/r2/buzz press]");
});

it("clears a previous roster's winner rather than transferring it to the new first player", () => {
  const runtime = createScreenController({ screen, defs, touchNow: () => 30 });
  expect(runtime.press("pad/r1/buzz").ok).toBe(true);
  const store = runtime.store;
  const changed = { ...screen, components: [{ ...screen.components[0]!, players: players.slice(1) }] };
  const replacement = createScreenController({ screen: changed, defs, store, touchNow: () => 45 });
  expect(replacement.canPress("pad/r1/buzz")).toBe(true);
  expect(replacement.snapshotScreen().components[0]?.state).toBeUndefined();
  replacement.mount();
  expect(store.get(`s/pad/${buzzKey}`)).toBeUndefined();
  expect(runtime.canPress("pad/r1/buzz")).toBe(true);
  expect(replacement.press("pad/r1/buzz").ok).toBe(true);
  expect(replacement.liveControls(def.meta, { players: players.slice(1) }, "pad")[buzzKey]).toEqual({
    winner: "r1",
    deltas: { r1: 0 },
  });
});
