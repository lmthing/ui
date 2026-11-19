import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition, type ScreenLike } from "@lmthing/ui/catalog";
import { drawKey } from "../../../../catalog";
import { createAgentAccess, createScreenController, createInteractionStore } from "../../index";

it("blocks standalone draws while loading without a controller runtime marker", () => {
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
  const current = (): ScreenLike => ({
    id: "s",
    components: [{ c: "ChanceFixture", id: "c1", state: "empty", options: ["A", "B"] }],
  });
  const store = createInteractionStore({ "s/c1/$state": "loading" });
  const agent = createAgentAccess({ current, defs: { ChanceFixture: fixture }, store, random: () => 1 });
  const press = { address: "c1/draw", action: "press" };
  expect(agent.read()).toBe("screen s\nc1 ChanceFixture (loading)");
  expect(agent.act(press).ok).toBe(false);
  store.set("s/c1/$state", undefined);
  expect(agent.act(press).ok).toBe(true);
  expect(agent.read()).toContain("index=1");
});

it("draws with the standalone selection and permanently expires invalidated results in a batch", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "ChanceFixture",
      actions: { parts: { roll: ["press"], two: ["select"], three: ["select"] } },
      emptyActions: ["roll.press", "two.select", "three.select"],
      draw: { kind: "faces", press: "roll", count: "count", sides: "sides" },
      select: { prop: "count", value: "index", parts: { two: 2, three: 3 } },
    },
    props: z.strictObject({ count: z.int().min(1), sides: z.int().min(2) }),
    examples: [],
    fallback: () => ({ count: 2, sides: 6 }),
    probes: [],
  };
  const current = (): ScreenLike => ({
    id: "s",
    components: [{ c: "ChanceFixture", id: "c1", state: "empty", count: 2, sides: 6 }],
  });
  const store = createInteractionStore();
  const agent = createAgentAccess({ current, defs: { ChanceFixture: fixture }, store, random: () => 4 });
  expect(
    agent.act([
      { address: "c1/three", action: "select" },
      { address: "c1/roll", action: "press" },
    ]).ok,
  ).toBe(true);
  expect(agent.read()).toContain("faces=[5,5,5]");
  expect(
    agent.act([
      { address: "c1/two", action: "select" },
      { address: "c1/three", action: "select" },
    ]).ok,
  ).toBe(true);
  expect(store.get(`s/c1/${drawKey}`)).toBeUndefined();
  expect(agent.read()).toContain("ChanceFixture (empty)");
});

it("blocks a non-draw empty action while the standalone store reports loading", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "EmptyFixture",
      actions: { parts: { start: ["press"] } },
      emptyActions: ["start.press"],
    },
    props: z.strictObject({}),
    examples: [{}],
    fallback: () => ({}),
    probes: [],
  };
  const current = (): ScreenLike => ({
    id: "s",
    components: [{ c: "EmptyFixture", id: "c1", state: "empty" }],
  });
  const store = createInteractionStore();
  const agent = createAgentAccess({ current, defs: { EmptyFixture: fixture }, store });
  const press = { address: "c1/start", action: "press" };
  expect(agent.read()).toContain("[c1/start press]");
  expect(agent.act(press).ok).toBe(true);
  store.set("s/c1/$state", "loading");
  expect(agent.read()).toBe("screen s\nc1 EmptyFixture (loading)");
  expect(agent.act(press).ok).toBe(false);
});

it("uses declared choices and bounded numeric edits in the same draw snapshot", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "ChanceFixture",
      actions: { parts: { roll: ["press"], choose: ["select"], sides: ["set"] } },
      emptyActions: ["roll.press", "choose.select", "sides.set"],
      draw: { kind: "faces", press: "roll", count: "count", sides: "sides" },
      select: { prop: "count", choices: { choose: [2, 3] } },
      set: { sides: { prop: "sides", min: 2, max: 8, integer: true } },
    },
    props: z.strictObject({ count: z.int(), sides: z.int() }),
    examples: [],
    fallback: () => ({ count: 2, sides: 6 }),
    probes: [],
  };
  const screen: ScreenLike = {
    id: "s",
    components: [{ id: "c1", c: fixture.meta.id, state: "empty", count: 2, sides: 6 }],
  };
  const defs = { [fixture.meta.id]: fixture };
  const roll = { address: "c1/roll", action: "press" };
  const choose = { address: "c1/choose", action: "select" };
  const set = { address: "c1/sides", action: "set" };
  for (const controlled of [false, true]) {
    const random = vi.fn(() => 7);
    const store = createInteractionStore();
    const runtime = controlled ? createScreenController({ screen, defs, store, random }) : undefined;
    const agent = createAgentAccess({
      current: () => screen,
      defs,
      store,
      random,
      ...(runtime && { runtime }),
    });
    expect(agent.read()).toContain("choices [2,3]");
    expect(agent.act([{ ...choose, value: 4 }, roll])).toMatchObject({ ok: false, at: 0 });
    expect(agent.act([roll, { ...set, value: 9 }])).toMatchObject({ ok: false, at: 1 });
    expect(random).not.toHaveBeenCalled();
    expect(agent.act([{ ...choose, value: 3 }, { ...set, value: 8 }, roll])).toMatchObject({ ok: true });
    expect(agent.read()).toContain("faces=[8,8,8]");
    if (runtime) expect(runtime.snapshotScreen().components[0]).toMatchObject({ count: 3, sides: 8 });
    expect(random).toHaveBeenCalledTimes(3);
  }
});

it("retains draws from edited derived options without copying those options into the wire", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "ChanceFixture",
      actions: { parts: { spin: ["press"] }, items: { weight: ["set"] } },
      draw: { kind: "pick", press: "spin", pool: "options" },
      items: { key: "options", parts: ["weight"], set: { weight: { prop: "weight", min: 1, max: 5 } } },
    },
    props: z
      .strictObject({ labels: z.array(z.string()) })
      .overwrite((props) => ({ ...props, options: props.labels.map((label) => ({ label, weight: 1 })) })),
    examples: [],
    fallback: () => ({ labels: ["A", "B"] }),
    probes: [],
  };
  const screen = { id: "s", components: [{ id: "c1", c: fixture.meta.id, labels: ["A", "B"] }] };
  const runtime = createScreenController({ screen, defs: { [fixture.meta.id]: fixture }, random: () => 1 });
  expect(runtime.act({ address: "c1/r1/weight", action: "set", value: 3 })).toMatchObject({ ok: true });
  expect(runtime.press("c1/spin")).toMatchObject({ ok: true });
  expect(runtime.read()).toContain("index=1");
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(runtime.act({ address: "c1/r1/weight", action: "set", value: 4 })).toMatchObject({ ok: true });
  expect(runtime.store.get(`s/c1/${drawKey}`)).toBeUndefined();
});
