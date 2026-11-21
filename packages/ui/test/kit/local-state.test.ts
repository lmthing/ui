import { expect, it, vi } from "vitest";
import { z } from "zod";
import { defineLocalState, planAct, readScreen, type Definition, type Meta } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const observation = z.strictObject({
  at: z.number().int().nonnegative(),
  value: z.number(),
  stale: z.boolean(),
});
function cached(data: Readonly<Record<string, readonly unknown[] | undefined>>) {
  return observation.safeParse(data.cached?.[0]).data;
}
const meta = {
  id: "CachedFixture",
  group: "content",
  purpose: "Inspect local cached observations",
  pick: "Inspect local cached observations",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Cached observation",
  deviceData: ["cached"],
  deviceDataFlags: { stale: (data) => cached(data)?.stale ?? true },
  actions: {
    parts: { unit: ["toggle"], fresh: ["press"], add: ["increment"], undo: ["press"] },
    when: { fresh: { stale: false }, undo: { canUndo: true } },
  },
  live: {
    toggles: { unit: { prop: "alternate", initial: false } },
    derive: (props, _instance, data) => ({
      observedAt: cached(data)?.at,
      observed: cached(data)?.value,
      canUndo: Number(props.count) > 0 && props.alternate === true,
    }),
  },
  localState: defineLocalState({
    schema: z.strictObject({ count: z.number().int().min(0).max(2), score: z.number().int().min(0).max(4) }),
    initial: () => ({ count: 0, score: 0 }),
    events: ["add.increment", "undo.press"],
    reduce: ({ count, score }, { part }) => {
      const delta = part === "add" ? 1 : -1;
      return { state: { count: count + delta, score: score + delta * 2 } };
    },
    project: ({ count, score }) => ({ count, score }),
  }),
  read: (input) => {
    const { count, score, stale, observedAt, observed } = input as Record<string, unknown>;
    return [`count ${count} score ${score}`, `${stale ? "cached" : "current"} ${observed} at ${observedAt}`];
  },
} satisfies Meta;
const defs = {
  CachedFixture: { meta, props: z.strictObject({}), fallback: () => ({}), examples: [], probes: [] },
} satisfies Record<string, Definition>;
const screen = { id: "home", components: [{ id: "c", c: meta.id }] };
const data = { cached: [{ at: 1234, value: 12, stale: true }] };
const unit = { address: "home/c/unit", action: "toggle" };
const add = { address: "home/c/add", action: "increment" };
const undo = { address: "home/c/undo", action: "press" };
const fresh = { address: "home/c/fresh", action: "press" };

it("keeps cached content and local controls readable while gating fresh-only work", () => {
  const runtime = createScreenController({ screen, defs, deviceData: data });
  try {
    expect(runtime.read()).toContain("c CachedFixture count 0 score 0 — cached 12 at 1234");
    expect(runtime.read()).not.toContain("[c/fresh");
    expect(runtime.actionsAt(fresh.address)).toEqual([]);
    expect(runtime.act(fresh)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(screen, defs, {}, [fresh], null, "planner", data)).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(runtime.press(unit.address).ok).toBe(true);
    expect(runtime.read()).toContain("[c/unit toggle:on]");
    expect(runtime.liveControls(meta, {}, "c")).toMatchObject({
      alternate: true,
      stale: true,
      observed: 12,
      observedAt: 1234,
    });
    expect(runtime.snapshotScreen()).toEqual(screen);
    const current = { cached: [{ ...data.cached[0]!, stale: false }] };
    expect(readScreen(screen, defs, {}, undefined, current)).toContain("[c/fresh press]");
    expect(planAct(screen, defs, {}, [fresh], null, "planner", current).ok).toBe(true);
  } finally {
    runtime.dispose();
  }
});

it("publishes one complete transition and none for dry runs or failed batches", () => {
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, deviceData: data, requireMounted: true, onAction });
  const snapshots: unknown[] = [];
  const unsubscribe = runtime.store.subscribe(() => snapshots.push(runtime.liveControls(meta, {}, "c")));
  try {
    runtime.registerPart(unit.address);
    runtime.registerPart(add.address);
    const steps = [unit, add, undo, add];
    expect(runtime.act(steps, { dryRun: true }).ok).toBe(true);
    expect(snapshots).toEqual([]);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act([...steps, add, add])).toMatchObject({ ok: false, at: 5, code: "invalid_value" });
    expect(snapshots).toEqual([]);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act(steps).ok).toBe(true);
    expect(snapshots).toMatchObject([{ alternate: true, count: 1, score: 2 }]);
    expect(onAction).toHaveBeenCalledTimes(4);
    expect(runtime.read()).toContain("count 1 score 2");
    expect(runtime.actionsAt(undo.address)).toEqual(["press"]);
    expect(runtime.snapshotScreen()).toEqual(screen);
    runtime.reset();
    expect(runtime.read()).toContain("count 0 score 0");
    expect(runtime.read()).toContain("[c/unit toggle:off]");
  } finally {
    unsubscribe();
    runtime.dispose();
  }
});
