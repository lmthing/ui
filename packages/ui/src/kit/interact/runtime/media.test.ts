import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import { drawKey, type Definition } from "../../../catalog";
import { createScreenController, type MediaAdapter } from "../index";

const fixture: Definition = {
  meta: {
    ...components.Button.meta,
    id: "ChanceFixture",
    actions: { parts: { draw: ["press"] } },
    emptyActions: ["draw.press"],
    draw: { kind: "pick", press: "draw", pool: "options" },
  },
  props: z.strictObject({ options: z.array(z.string()).min(2).max(4) }),
  examples: [],
  fallback: () => ({ options: ["A", "B"] }),
  probes: [],
};

it("rolls back newly prepared media and discards its events when sampling fails", () => {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const open = vi.fn<MediaAdapter["open"]>((_reference, callbacks) => {
    callbacks.onTime(4);
    return session;
  });
  const runtime = createScreenController({
    defs: { ...components, ChanceFixture: fixture },
    screen: {
      id: "s",
      components: [
        { c: "ChanceFixture", id: "c1", state: "empty", options: ["A", "B"] },
        { c: "Player", id: "p1", media: "lib:fixture", title: "Item", seconds: 30 },
      ],
    },
    media: { open },
    random: () => {
      throw new Error("No entropy");
    },
  });
  try {
    expect(
      runtime.act([
        { address: "c1/draw", action: "press" },
        { address: "p1/play", action: "play" },
      ]),
    ).toMatchObject({ ok: false, code: "random_unavailable" });
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.play).not.toHaveBeenCalled();
    open.mock.calls[0]![1].onPlaying(true);
    expect(runtime.store.snapshot()).toEqual({});
    expect(runtime.mountMedia("p1")).toBe(session);
    expect(open).toHaveBeenCalledTimes(2);
  } finally {
    runtime.dispose();
  }
});

it("commits a successful seek ahead of the media adapter's initial playhead", () => {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const runtime = createScreenController({
    defs: { ...components, ChanceFixture: fixture },
    screen: {
      id: "s",
      components: [
        { c: "ChanceFixture", id: "c1", state: "empty", options: ["A", "B"] },
        { c: "Player", id: "p1", media: "lib:fixture", title: "Item", seconds: 30 },
      ],
    },
    media: {
      open: (_ref, callbacks) => {
        callbacks.onTime(4);
        return session;
      },
    },
    random: () => 1,
  });
  const observed: unknown[] = [];
  const unsubscribe = runtime.store.subscribe(() => observed.push(runtime.store.get("s/p1/scrubber")));
  try {
    expect(
      runtime.act([
        { address: "c1/draw", action: "press" },
        { address: "p1/scrubber", action: "seek", value: 20 },
      ]).ok,
    ).toBe(true);
    expect(session.seek).toHaveBeenCalledExactlyOnceWith(20);
    expect(runtime.store.get("s/p1/scrubber")).toBe(20);
    expect(observed).toEqual([20]);
  } finally {
    unsubscribe();
    runtime.dispose();
  }
});

it("executes the validated batch at the same time even if media preparation crosses a clock boundary", () => {
  let now = 0;
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const timed: Definition = {
    ...fixture,
    meta: {
      ...fixture.meta,
      id: "TimedChance",
      clocks: [{ id: "wait", kind: "down", from: "seconds", zero: { state: "loading" } }],
    },
    props: z.strictObject({ options: z.array(z.string()).min(2).max(4), seconds: z.int().min(1) }),
  };
  const random = vi.fn(() => 1);
  const runtime = createScreenController({
    defs: { ...components, ChanceFixture: fixture, TimedChance: timed },
    screen: {
      id: "s",
      components: [
        { c: "ChanceFixture", id: "c1", state: "empty", options: ["A", "B"] },
        { c: "Player", id: "p1", media: "lib:fixture", title: "Item", seconds: 30 },
        { c: "TimedChance", id: "c2", state: "empty", options: ["C", "D"], seconds: 1 },
      ],
    },
    media: {
      open: () => {
        now = 1000;
        return session;
      },
    },
    now: () => now,
    random,
  });
  try {
    expect(
      runtime.act([
        { address: "c1/draw", action: "press" },
        { address: "p1/play", action: "play" },
        { address: "c2/draw", action: "press" },
      ]).ok,
    ).toBe(true);
    expect(random).toHaveBeenCalledTimes(2);
    expect(runtime.store.get(`s/c2/${drawKey}`)).toMatchObject({ state: { index: 1 } });
    expect(runtime.snapshotScreen().components[2]?.state).toBe("loading");
  } finally {
    runtime.dispose();
  }
});
