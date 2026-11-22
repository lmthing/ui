import { expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  stampItemIds,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.CardioSession;
const summary = examples[0]!,
  active = examples[1]!,
  idle = examples[2]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const at = (part: string) => `home/c1/${part}`;
const emptyCast = { things: [], items: [] };
const host = (input: object, state: StateName = "filled") => {
  let now = 1000;
  const onAction: { address: string; action: string }[] = [];
  const runtime = createScreenController({
    screen: { id: "home", components: [{ id: "c1", c: meta.id, ...input, state }] },
    defs: components,
    now: () => now,
    onAction: (event) => onAction.push(event),
  });
  return {
    runtime,
    onAction,
    tick: (seconds: number) => {
      now += seconds * 1000;
      runtime.tick();
    },
  };
};

it("accepts both structures and bounded split data without Writer-authored calculations", () => {
  for (const input of examples) expect(props.safeParse(input).success).toBe(true);
  expect(props.parse(summary)).toMatchObject({ style: "summary", live: false, detail: "full" });
  const split = { label: "A".repeat(8), seconds: 1, elevationDelta: -12 };
  expect(props.safeParse({ ...summary, splits: Array(30).fill(split) }).success).toBe(true);
  for (const fields of [
    { splits: Array(31).fill(split) },
    { splits: [{ ...split, label: "A".repeat(9) }] },
    { splits: [{ ...split, seconds: 0 }] },
    { splits: [{ ...split, id: "r1" }] },
    { startedAt: "2026-11-19T07:00:00" },
    { elapsedSeconds: -1 },
    { distance: Infinity },
    { hrZone: 0 },
    { hrZone: 6 },
    { hrZone: 2.5 },
    { style: "grid" },
    { pace: 310 },
    { canStart: true },
  ])
    expect(props.safeParse({ ...summary, ...fields }).success).toBe(false);
});

it("seeds no artificial measurements and preserves the core near miss and pack readiness", () => {
  expect(fallback({ cast: emptyCast })).toMatchObject({ elapsedSeconds: 0, distance: 0, splits: [] });
  const cast = { ...emptyCast, things: [{ type: "swim", fields: [] }] };
  expect(fallback({ cast }).activity).toBe("swim");
  expect(meta).toMatchObject({
    dense: true,
    weight: 3,
    tier: "ok",
    partTiers: { start: "ok", finish: "phone" },
  });
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
  expect(createRegistry({ packs: ["health"] }).ids.includes(meta.id)).toBe(packReady("health"));
  const parsed = stampItemIds(meta, props.parse(idle));
  expect(affordancesOf(meta, parsed, "c1").map(({ action, part }) => [part, action])).toEqual([
    ["start", "start"],
  ]);
});

it("draws addressed telemetry once and hides the brief values without renumbering splits", () => {
  const html = renderInstance(meta.id, summary, "filled", theme);
  const parts = [...html.matchAll(/data-testid="(home\/c1\/[^"]+)"/g)].map((m) => m[1]);
  expect(new Set(parts).size).toBe(parts.length);
  for (const p of [
    "root",
    "elapsed",
    "distance",
    "pace",
    "elevation",
    "heart",
    "zone",
    "splits_heading",
    "r1/root",
    "r5/label",
    "r4/elevation_delta",
  ])
    expect(parts).toContain(at(p));
  const brief = renderInstance(meta.id, { ...summary, detail: "brief" }, "filled", theme);
  expect(brief).not.toMatch(/data-testid="[^"]*\/(?:elevation|elevation_delta|zone)"/);
  expect(brief).toContain(at("r5/label"));
  expect(elementAt(renderInstance(meta.id, active, "filled", theme), at("pause")).attributes).toContain(
    'role="button"',
  );
});

it.each(["empty", "loading", "success", "error"] as const)("shows an inert %s state", (state) => {
  const html = renderInstance(meta.id, active, state, theme);
  expect(html).toContain(at("root"));
  expect(html).not.toMatch(/role="button"/);
  const expected = {
    empty: "Nothing here yet",
    loading: 'aria-busy="true"',
    success: "Session saved",
    error: "Sensor data unavailable",
  };
  expect(html).toContain(expected[state]);
  const { runtime } = host(active, state);
  for (const part of ["pause", "lap", "finish", "start", "resume"])
    expect(runtime.actionsAt(`c1/${part}`)).toEqual([]);
  runtime.dispose();
});

it("starts, pauses, resumes, dispatches a lap, and saves at the paused elapsed time", () => {
  const { runtime, tick, onAction } = host(idle);
  const act = (part: string, action: string) => runtime.act({ address: `c1/${part}`, action }).ok;
  try {
    expect(act("lap", "press")).toBe(false);
    expect(act("start", "start")).toBe(true);
    tick(4);
    expect(act("start", "start")).toBe(false);
    expect(act("lap", "press")).toBe(true);
    expect(onAction).toContainEqual(expect.objectContaining({ address: at("lap"), action: "press" }));
    expect(act("pause", "pause")).toBe(true);
    tick(5);
    expect(runtime.read()).toContain("Elapsed time: 0:04");
    expect(act("lap", "press")).toBe(false);
    expect(act("resume", "play")).toBe(true);
    tick(3);
    expect(act("pause", "pause")).toBe(true);
    expect(act("finish", "stop")).toBe(true);
    tick(20);
    expect(runtime.read()).toContain("Session saved");
    expect(runtime.read()).toContain("Elapsed time: 0:07");
    const { c: _c, id: _id, state, ...saved } = runtime.snapshotScreen().components[0]!;
    expect(state).toBe("success");
    expect(saved.elapsedSeconds).toBe(7);
    expect(props.safeParse(saved).success).toBe(true);
    expect(act("resume", "play")).toBe(false);
  } finally {
    runtime.dispose();
  }
});

it("ticks an already-running seed, but never starts a summary clock", () => {
  const running = host(active),
    finished = host(summary);
  try {
    running.tick(3);
    finished.tick(3);
    expect(running.runtime.read()).toContain("Elapsed time: 29:03");
    expect(finished.runtime.read()).toContain("Elapsed time: 25:50");
    expect(finished.runtime.actionsAt("c1/start")).toEqual([]);
  } finally {
    running.runtime.dispose();
    finished.runtime.dispose();
  }
});
