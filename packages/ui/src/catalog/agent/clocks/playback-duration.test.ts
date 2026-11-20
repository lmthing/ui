import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../../kit/interact";
import type { ClockMeta, Definition } from "../../index";

function player(clockOptions: Partial<ClockMeta> = {}, minutes = 1) {
  const fixture: Definition = {
    meta: {
      id: "MixFixture",
      group: "input",
      purpose: "Play a mix",
      pick: "Play a mix",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Local playback",
      parts: ["root", "mix", "timer"],
      set: { timer: { prop: "minutes", min: 0, max: 120, integer: true } },
      actions: { parts: { mix: ["play", "pause"], timer: ["set"] } },
      clocks: [
        {
          id: "mix",
          kind: "up",
          max: ({ minutes }) => (Number(minutes) ? Number(minutes) * 60 : Infinity),
          prop: "elapsed",
          runningProp: "running",
          start: { part: "mix", action: "play" },
          stop: { part: "mix", action: "pause" },
          ...clockOptions,
        },
      ],
    },
    props: z.strictObject({ minutes: z.int().min(0).max(120) }),
    examples: [],
    fallback: () => ({ minutes }),
    probes: [],
  };
  return {
    defs: { MixFixture: fixture },
    screen: { id: "s", components: [{ id: "m1", c: "MixFixture", minutes }] },
  };
}

const mix = "m1/mix";
const slot = "s/m1/$mix";
const edit = (value: number) => ({ address: "m1/timer", action: "set", value });

it.each([
  { initial: 1, selected: 2 },
  { initial: 2, selected: 1 },
  { initial: 3, selected: 0 },
  { initial: 0, selected: 1 },
])("uses edited duration at tick time ($initial to $selected min)", ({ initial, selected }) => {
  let now = 0;
  const runtime = createScreenController({
    ...player({ liveDuration: true, restartOnPlay: true }, initial),
    now: () => now,
  });
  try {
    expect(runtime.press(mix).ok).toBe(true);
    now = 1000;
    expect(runtime.act(edit(selected)).ok).toBe(true);
    expect(runtime.snapshotScreen().components[0]?.minutes).toBe(selected);
    now = selected ? selected * 60000 - 1 : initial * 60000;
    runtime.tick();
    expect(runtime.store.get(slot)).toMatchObject({ running: true });
    expect(runtime.actionsAt(mix)).toEqual(["pause"]);
    if (selected) {
      now++;
      runtime.tick();
      expect(runtime.store.get(slot)).toMatchObject({ running: false, seconds: selected * 60 });
      expect(runtime.actionsAt(mix)).toEqual(["play"]);
      expect(runtime.press(mix).ok).toBe(true);
      expect(runtime.store.get(slot)).toMatchObject({ running: true, seconds: 0, remainder: 0 });
    }
  } finally {
    runtime.dispose();
  }
});

it.each([true, false])(
  "restarts only at expiry and clears the old tick remainder (mounted: %s)",
  (mounted) => {
    vi.useFakeTimers();
    const fixture = player({ restartOnPlay: true, max: 2 });
    const store = createInteractionStore();
    const runtime = mounted ? createScreenController({ ...fixture, store }) : undefined;
    const access = runtime ?? createAgentAccess({ ...fixture, current: () => fixture.screen, store });
    const play = { address: mix, action: "play" };
    const pause = { address: mix, action: "pause" };
    try {
      expect(access.act(play).ok).toBe(true);
      vi.advanceTimersByTime(1250);
      expect(access.act(pause).ok).toBe(true);
      expect(access.act(play).ok).toBe(true);
      expect(store.get(slot)).toMatchObject({ running: true, seconds: 1, remainder: 250 });
      vi.advanceTimersByTime(900);
      expect(access.read()).toContain("[m1/mix play]");
      expect(access.act(pause).ok).toBe(false);
      expect(access.act(play).ok).toBe(true);
      expect(store.get(slot)).toMatchObject({ running: true, seconds: 0, remainder: 0 });
    } finally {
      runtime?.dispose();
      vi.useRealTimers();
    }
  },
);

it("retains authored tick duration and terminal play gating without the opt-ins", () => {
  let now = 0;
  const runtime = createScreenController({ ...player(), now: () => now });
  try {
    expect(runtime.act(edit(2)).ok).toBe(true);
    expect(runtime.press(mix).ok).toBe(true);
    now = 60000;
    runtime.tick();
    expect(runtime.store.get(slot)).toMatchObject({ running: false, seconds: 60 });
    expect(runtime.act(edit(1)).ok).toBe(true);
    expect(runtime.press(mix).ok).toBe(false);
  } finally {
    runtime.dispose();
  }
});

it("replays from zero after an expired timer is edited", () => {
  let now = 0;
  const runtime = createScreenController({
    ...player({ liveDuration: true, restartOnPlay: true }),
    now: () => now,
  });
  try {
    expect(runtime.press(mix).ok).toBe(true);
    now = 60000;
    runtime.tick();
    expect(runtime.act(edit(0)).ok).toBe(true);
    expect(runtime.press(mix).ok).toBe(true);
    expect(runtime.store.get(slot)).toMatchObject({ running: true, seconds: 0 });
  } finally {
    runtime.dispose();
  }
});
