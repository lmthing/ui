import { components, planAct, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../../kit/interact";
import { matchRecordKind } from "..";

const screen: ScreenLike = {
  id: "match",
  components: [
    { ...components.Scoreboard.examples[0], id: "s1", c: "Scoreboard", homeScore: 1, awayScore: 0 },
    { ...components.MatchFeed.examples[0], id: "m1", c: "MatchFeed" },
  ],
};
const journal = `$record:${matchRecordKind}:match`;
const add = { address: "s1/away", action: "increment" };
const undo = { address: "s1/home", action: "decrement" };
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };

it("commits only on confirmation and projects the same record in the reader and both live views", () => {
  let now = 0;
  const runtime = createScreenController({ screen, defs: components, now: () => now });
  const store = runtime.store;
  expect(runtime.read()).toContain("Ledge Rovers 1–0 Fern House");
  expect(runtime.read()).toContain("Reed scores from the edge");
  expect(runtime.act({ address: "s1/clock", action: "start" }).ok).toBe(true);
  now = 51 * 60_000;
  expect(runtime.act([add, confirm], { dryRun: true }).ok).toBe(true);
  expect(store.get(journal)).toBeUndefined();
  expect(runtime.act(add).ok).toBe(true);
  expect(store.get(journal)).toBeUndefined();
  expect(runtime.act(cancel).ok).toBe(true);
  expect(store.get(journal)).toBeUndefined();
  expect(runtime.act([add, confirm]).ok).toBe(true);
  expect(store.get(journal)).toEqual([
    { kind: "add", goal: { id: 4, side: "away", minute: 51, scorer: null } },
  ]);
  const added = runtime.read();
  expect(added).toContain("Ledge Rovers 1–1 Fern House");
  expect(added).toContain("51′ away goal: Goal");
  expect(added).toContain("Reed scores from the edge");
  expect(added).toContain("Caution for Birch");
  expect(store.get("match/s1/away")).toBeUndefined();
  const scoreDef = components.Scoreboard;
  const feedDef = components.MatchFeed;
  const score = () =>
    runtime.liveControls(
      scoreDef.meta,
      scoreDef.props.parse({ ...scoreDef.examples[0], homeScore: 1, awayScore: 0 }),
      "s1",
    );
  const feed = () =>
    runtime.liveControls(feedDef.meta, feedDef.props.parse(feedDef.examples[0]), "m1").events;
  expect(score()).toMatchObject({ homeScore: 1, awayScore: 1 });
  expect(feed()).toMatchObject([
    { id: "r16", minute: 51 },
    { text: "Reed scores from the edge" },
    { text: "Caution for Birch" },
    { text: "Moss replaces Gardner" },
  ]);
  expect(runtime.act([undo, confirm]).ok).toBe(true);
  expect(store.get(journal)).toMatchObject([{ kind: "add" }, { kind: "undo", id: 3 }]);
  expect(score()).toMatchObject({ homeScore: 0, awayScore: 1 });
  expect(feed()).toMatchObject([
    { id: "r16", minute: 51 },
    { text: "Caution for Birch" },
    { text: "Moss replaces Gardner" },
  ]);
  expect(runtime.read()).not.toMatch(/Reed scores|s1\/home decrement/);
  expect(runtime.snapshotScreen().components[0]).toMatchObject({ homeScore: 1, awayScore: 0 });
  expect(runtime.snapshotScreen().components[1]!.events).toEqual(components.MatchFeed.examples[0]!.events);
  runtime.dispose();
});

it("prefers the host record and does not confirm a stale undo against a replacement goal", () => {
  const goals = [{ id: 4, side: "home", minute: 23, scorer: "Quinn" }];
  const data = { [matchRecordKind]: [{ matchId: screen.id, goals }] };
  const runtime = createScreenController({ screen, defs: components, deviceData: data });
  expect(runtime.read()).toContain("23′ home goal: Quinn");
  expect(runtime.read()).not.toContain("Reed scores");
  expect(runtime.act(undo).ok).toBe(true);
  goals[0] = { ...goals[0]!, scorer: "Taylor" };
  expect(runtime.act(confirm)).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.store.get(journal)).toBeUndefined();
  expect(runtime.act(cancel).ok).toBe(true);
  expect(runtime.read()).toContain("23′ home goal: Taylor");
  runtime.dispose();
});

it("supports detached confirmation while isolating independently scoped matches", () => {
  const store = createInteractionStore();
  const agent = createAgentAccess({ defs: components, store, current: () => screen });
  expect(planAct(screen, components, {}, [add])).toMatchObject({ ok: true, values: {} });
  expect(agent.act([add, confirm]).ok).toBe(true);
  expect(agent.read()).toContain("Ledge Rovers 1–1 Fern House");
  const other = readScreen({ ...screen, id: "other" }, components, store.snapshot());
  expect(other).toContain("Ledge Rovers 1–0 Fern House");
  const before = store.snapshot();
  expect(agent.act([undo, confirm, { address: "missing", action: "press" }]).ok).toBe(false);
  expect(store.snapshot()).toEqual(before);
});
