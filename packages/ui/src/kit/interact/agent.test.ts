import { describe, expect, it } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
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
    expect(agent.read()).toContain("[trail toggle:on]");
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
