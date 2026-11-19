import { describe, expect, it } from "vitest";
import { z } from "zod";
import { components, type Definition, type ScreenLike } from "@lmthing/ui/catalog";
import { drawKey } from "../../catalog";
import { createAgentAccess } from "./agent";
import { createInteractionStore } from "./store";

const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "l1", c: "List", rows: [{ title: "Fern", trail: "toggle", goto: "fern" }, { title: "Basil" }] },
    { id: "b1", c: "Button", label: "Log watering" },
  ],
};

function access() {
  const links: string[] = [];
  const store = createInteractionStore();
  const agent = createAgentAccess({
    defs: components,
    store,
    current: () => screen,
    onLink: (goto) => links.push(goto),
  });
  return { agent, store, links };
}

describe("agent access", () => {
  it("toggles a part and reads it back", () => {
    const { agent, store } = access();
    expect(agent.act({ address: "home/l1/r1/trail", action: "toggle" })).toMatchObject({ ok: true });
    expect(store.get("home/l1/r1/trail")).toBe(true);
    expect(agent.read()).toContain("[l1/r1/trail toggle:on]");
  });
  it("follows links on press", () => {
    const { agent, links } = access();
    agent.act({ address: "l1/r1", action: "press" });
    expect(links).toEqual(["fern"]);
  });
  it("dry runs without changing anything", () => {
    const { agent, store } = access();
    const reply = agent.act({ address: "l1/r1/trail", action: "toggle" }, { dryRun: true });
    expect(reply).toMatchObject({ ok: true, dryRun: true, changed: "l1/r1/trail toggle = true" });
    expect(store.snapshot()).toEqual({});
    expect(agent.log()).toEqual([]);
  });
  it("is atomic: a bad step leaves every earlier step undone", () => {
    const { agent, store } = access();
    const reply = agent.act([
      { address: "l1/r1/trail", action: "toggle" },
      { address: "b1", action: "type", value: "x" },
    ]);
    expect(reply).toMatchObject({ ok: false, code: "not_actionable", at: 1 });
    expect(store.snapshot()).toEqual({});
  });
  it("rejects invalid values with a short hint", () => {
    const { agent } = access();
    expect(agent.act({ address: "b1", action: "press", value: 3 })).toMatchObject({
      ok: false,
      code: "invalid_value",
      hint: "press takes no value",
    });
  });
});

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
