import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type MediaAdapter } from "@lmthing/ui/kit";
import { planAct, readComponent, readScreen, type ScreenLike } from "../index";

const fixture: Definition = {
  meta: {
    id: "ChaptersFixture",
    group: "content",
    purpose: "Jump to a named position in a recording.",
    pick: "Named positions inside one recording.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Saved chapter marks.",
    drives: "Player",
    items: { key: "chapters", parts: ["root"] },
    actions: { items: { root: ["press"] } },
  },
  props: z.strictObject({
    chapters: z
      .array(z.strictObject({ title: z.string(), at: z.int().min(0) }))
      .min(2)
      .max(16),
  }),
  fallback: () => ({
    chapters: [
      { title: "First", at: 0 },
      { title: "Second", at: 12 },
    ],
  }),
  examples: [],
  probes: [],
};
const defs = { ChaptersFixture: fixture, Player: components.Player };
const chapters = {
  c: "ChaptersFixture",
  id: "c1",
  chapters: [
    { title: "First", at: 0 },
    { title: "Second", at: 12 },
    { title: "Third", at: 60 },
  ],
};
const player = { c: "Player", id: "p1", media: "lib:fixture", title: "Recording", seconds: 30 };
const address = "home/c1/r2/root";
const playhead = "home/p1/scrubber";
const press = { address, action: "press" };
const screen: ScreenLike = { id: "home", components: [chapters, player] };

function setup(current: ScreenLike = screen) {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const open = vi.fn<MediaAdapter["open"]>(() => session);
  const runtime = createScreenController({ screen: current, defs, media: { open }, requireMounted: true });
  runtime.registerPart(address);
  runtime.registerPart("home/c1/r1/root");
  runtime.registerPart(playhead);
  const agent = createAgentAccess({ defs, store: runtime.store, current: () => current, runtime });
  return { runtime, agent, session, open };
}

it("offers a chapter by its item address and stages the target seek without changing the input", () => {
  expect(readScreen(screen, defs)).toContain("[c1/r2 press]");
  expect(readScreen(screen, defs)).not.toContain("[c1/r3 press]");
  const before = Object.freeze({});
  expect(planAct(screen, defs, before, [press])).toMatchObject({
    ok: true,
    values: { [playhead]: 12 },
    changed: ["p1/scrubber seek = 12"],
    links: [],
  });
  expect(before).toEqual({});
  expect(planAct(screen, defs, before, [{ ...press, value: 4 }])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});

it("routes a controller tap and the agent's copied press to the Player adapter", () => {
  const { runtime, agent, session, open } = setup();
  try {
    expect(runtime.canPress(address)).toBe(true);
    expect(runtime.press(address)).toMatchObject({ ok: true, changed: "p1/scrubber seek = 12" });
    expect(runtime.store.get(playhead)).toBe(12);
    expect(agent.read()).toContain("[c1/r1 press]");
    expect(agent.act({ address: "c1/r1", action: "press" }).ok).toBe(true);
    expect(runtime.store.get(playhead)).toBe(0);
    expect(open).toHaveBeenCalledExactlyOnceWith("lib:fixture", expect.anything());
    expect(session.seek.mock.calls).toEqual([[12], [0]]);
    expect(agent.act({ address: playhead, action: "seek", value: 20 }).ok).toBe(true);
    expect(runtime.store.get(playhead)).toBe(20);
    expect(session.seek).toHaveBeenLastCalledWith(20);
  } finally {
    runtime.dispose();
  }
});

it.each([
  { name: "missing", targets: [] },
  { name: "loading", targets: [{ ...player, state: "loading" as const }] },
])("omits and rejects chapter presses when the Player is $name", ({ targets }) => {
  const current = { id: "home", components: [chapters, ...targets] };
  const { runtime, agent, open } = setup(current);
  try {
    expect(readScreen(current, defs)).not.toContain("[c1/r2 press]");
    expect(readComponent(fixture, { chapters: chapters.chapters }, "c1").join("\n")).not.toContain(
      "[c1/r2 press]",
    );
    expect(agent.read()).not.toContain("[c1/r2 press]");
    expect(runtime.canPress(address)).toBe(false);
    for (const result of [planAct(current, defs, {}, [press]), runtime.press(address), agent.act(press)])
      expect(result).toMatchObject({ ok: false, code: "not_actionable" });
    expect(open).not.toHaveBeenCalled();
  } finally {
    runtime.dispose();
  }
});

it("does not open or seek media during dry runs or a rejected batch", () => {
  const { runtime, agent, session, open } = setup();
  try {
    expect(agent.act(press, { dryRun: true }).ok).toBe(true);
    expect(agent.act([press, { address: "c1/r9", action: "press" }])).toMatchObject({ ok: false, at: 1 });
    expect(runtime.store.snapshot()).toEqual({});
    expect(open).not.toHaveBeenCalled();
    expect(session.seek).not.toHaveBeenCalled();
  } finally {
    runtime.dispose();
  }
});
