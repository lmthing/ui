import { expect, it } from "vitest";
import type { Values } from "@lmthing/ui/catalog";
import { nested, setup } from "./clock-fixtures";
const groups = [{ sets: [{ done: false }, { done: false }] }, { sets: [{ done: false }] }];
it("runs a session and independent rests on real nested addresses", () => {
  const { runtime, agent, advance, live } = setup(nested, { groups, rest: 5 });
  advance(2000, false);
  expect(agent.read()).toContain("elapsed 2");
  agent.act({ address: "f1/r1/done_1", action: "toggle" });
  advance(2000);
  agent.act({ address: "f1/r1/done_2", action: "toggle", value: true });
  advance(2000);
  expect(agent.read()).toContain("elapsed 6");
  expect(agent.read()).toContain("rest 1 true");
  expect(agent.read()).toContain("rest 3 true");
  expect(runtime.actionsAt("f1/r1/rest_1")).toEqual(["stop"]);
  expect(runtime.actionsAt("f1/r2/rest_1")).toEqual([]);
  expect(runtime.actionsAt("f1/r2/rest_2")).toEqual([]);
  expect(agent.act({ address: "f1/r1/rest_1", action: "stop" }).ok).toBe(true);
  advance(2000);
  const sets = (live().groups as { sets: Values[] }[])[0]!.sets;
  expect(sets).toMatchObject([
    { remaining: 1, done: true },
    { remaining: 1, done: true },
  ]);
  expect(groups[0]!.sets[0]!.done).toBe(false);
  expect(agent.act({ address: "f1/r1/reset_1", action: "press" }).ok).toBe(true);
  expect(agent.read()).toContain("rest 5 true");
  runtime.dispose();
});
it("gates start side effects on completion, stops all shared rests and freezes on finish", () => {
  const { runtime, agent, advance, live } = setup(nested, { groups, rest: 90 });
  agent.act({ address: "f1/r1/done_1", action: "toggle" });
  advance(3000);
  agent.act({ address: "f1/r1/done_1", action: "toggle", value: false });
  advance(2000);
  expect(agent.read()).toContain("rest 85 false");
  agent.act({ address: "f1/r1/done_2", action: "toggle" });
  expect(agent.act({ address: "f1/rest", action: "stop" }).ok).toBe(true);
  expect(runtime.store.get("test/f1/r1/$shared_1")).toMatchObject({ running: false });
  expect(runtime.store.get("test/f1/r1/$shared_2")).toMatchObject({ running: false });
  agent.act({ address: "f1/finish", action: "press" });
  const before = live();
  expect(agent.read()).toContain("ClockFixture (success)");
  advance(10000);
  expect(live()).toEqual(before);
  expect(agent.act({ address: "f1/r1/done_1", action: "toggle" }).ok).toBe(false);
  runtime.reset();
  advance(2000);
  expect(live().elapsed).toBe(2);
  expect(agent.read()).toContain("rest 90 false");
  runtime.dispose();
});
