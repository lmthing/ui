import { expect, it, vi } from "vitest";
import { z } from "zod";
import { drawKey, type Definition, type ScreenLike } from "../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../index";

const props = z.strictObject({
  cards: z.array(z.strictObject({ title: z.string() })),
  drawCount: z.int().min(1).max(3).default(3),
});
const deck: Definition = {
  meta: {
    id: "DeckFixture",
    group: "action",
    purpose: "Draw cards",
    pick: "Draw cards",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "Device entropy",
    draw: { kind: "deck", pool: "cards", count: "drawCount", press: "draw", reset: "reshuffle" },
    actions: { parts: { draw: ["press"], reshuffle: ["press"] } },
    emptyActions: ["draw.press"],
  },
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const cards = ["A", "B", "C", "D", "E", "F", "G"].map((title) => ({ title }));
const screen: ScreenLike = {
  id: "s",
  components: ["a", "b"].map((id) => ({ id, c: deck.meta.id, cards, state: "empty" })),
};
const defs = { [deck.meta.id]: deck };
const step = (address: string) => ({ address, action: "press" });
const live = (runtime: ReturnType<typeof createScreenController>, id = "a") =>
  runtime.liveControls(deck.meta, { cards, drawCount: 3 }, id)[drawKey];

it("commits a batch once and preserves it across store restoration and component instances", () => {
  const store = createInteractionStore();
  const random = vi.fn(() => 0);
  const runtime = createScreenController({ screen, defs, store, random });
  const changes = vi.fn(() => live(runtime));
  store.subscribe(changes);
  expect(runtime.read()).not.toContain('"G"');
  expect(runtime.act(step("a/draw"), { dryRun: true }).ok).toBe(true);
  expect(runtime.act([step("a/draw"), step("b/missing")])).toMatchObject({ ok: false, at: 1 });
  expect(random).not.toHaveBeenCalled();
  expect(changes).not.toHaveBeenCalled();
  expect(runtime.press("a/draw").ok).toBe(true);
  expect(changes).toHaveBeenCalledTimes(1);
  expect(changes).toHaveReturnedWith({
    kind: "deck",
    drawn: [0, 1, 2],
    discard: [0, 1, 2],
    remaining: 4,
  });
  const restored = createInteractionStore(JSON.parse(JSON.stringify(store.snapshot())));
  const next = createScreenController({ screen, defs, store: restored, random });
  expect(live(next)).toEqual(live(runtime));
  expect(live(next, "b")).toMatchObject({ drawn: [], discard: [], remaining: 7 });
  expect(next.act([step("a/draw"), step("a/draw")]).ok).toBe(true);
  expect(live(next)).toMatchObject({ drawn: [6], discard: [0, 1, 2, 3, 4, 5, 6], remaining: 0 });
  expect(next.snapshotScreen().components[0]).not.toHaveProperty(drawKey);
  expect(next.snapshotScreen().components[0]?.state).toBe("success");
  expect(next.read()).toContain("drawn=[6] — remaining=0 — discard=7");
  expect(next.canPress("a/draw")).toBe(false);
});

it("does not publish a partial draw when entropy fails in the middle", () => {
  const store = createInteractionStore();
  const random = vi
    .fn()
    .mockReturnValueOnce(0)
    .mockImplementation(() => {
      throw Error("No entropy");
    });
  const runtime = createScreenController({ screen, defs, store, random });
  expect(runtime.press("a/draw")).toMatchObject({ ok: false, code: "random_unavailable" });
  expect(store.snapshot()).toEqual({});
});

it("reshuffles only on acceptance, also in detached dispatch", () => {
  const store = createInteractionStore();
  const random = vi.fn(() => 0);
  const detached = createAgentAccess({ current: () => screen, defs, store, random });
  const runtime = createScreenController({ screen, defs, store });
  expect(detached.act(step("a/draw")).ok).toBe(true);
  expect(detached.act(step("a/reshuffle")).ok).toBe(true);
  expect(detached.read()).toContain("[confirm/confirm press]");
  expect(live(runtime)).toMatchObject({ remaining: 4 });
  expect(detached.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
  expect(live(runtime)).toMatchObject({ remaining: 4 });
  expect(detached.act(step("a/reshuffle")).ok).toBe(true);
  expect(detached.act(step("confirm/confirm")).ok).toBe(true);
  expect(live(runtime)).toMatchObject({ drawn: [], discard: [], remaining: 7 });
  expect(runtime.canPress("a/draw")).toBe(true);
  expect(random).toHaveBeenCalledTimes(3);
});

it("does not apply a pending reshuffle to replacement cards at the same address", () => {
  const store = createInteractionStore();
  const runtime = createScreenController({ screen, defs, store, random: () => 0 });
  expect(runtime.press("a/draw").ok).toBe(true);
  expect(runtime.press("a/reshuffle").ok).toBe(true);
  expect(runtime.confirmation).toBeDefined();
  const next = { ...screen, components: [{ ...screen.components[0]!, cards: [...cards].reverse() }] };
  const replacement = createScreenController({ screen: next, defs, store });
  expect(replacement.confirmation).toBeUndefined();
  expect(replacement.press("confirm/confirm").ok).toBe(false);
  expect(replacement.canPress("a/draw")).toBe(true);
});
