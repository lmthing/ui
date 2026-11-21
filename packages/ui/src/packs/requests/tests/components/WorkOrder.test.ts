import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  type ActStep,
  type CastLike,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { WorkOrder } from "../../components";

const def = components.WorkOrder;
const { meta, props, fallback, examples, probes } = def;
const blocked = examples[0]!;
const summary = examples[1]!;
const ready = { ...blocked, status: "ready", blockedBy: undefined, note: undefined } as const;

describe("WorkOrder contract and boundaries", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it.each([
    { number: "x".repeat(13) },
    { request: "x".repeat(13) },
    { who: "x".repeat(25) },
    { title: "x".repeat(33) },
    { from: "14:00" },
    { date: undefined },
    { from: undefined },
    { to: "23:60" },
    { status: "complete" },
    { blockedBy: "none" },
    { blockedBy: undefined },
    { note: " " },
    { note: "x".repeat(121) },
    { tasks: [] },
    { tasks: Array(7).fill(blocked.tasks[0]) },
    { tasks: [{ ...blocked.tasks[0], text: "x".repeat(37) }] },
    { tasks: [{ ...blocked.tasks[0], id: "r1" }] },
    { parts: Array(9).fill(blocked.parts[0]) },
    { parts: [{ ...blocked.parts[0], qty: 0 }] },
    { parts: [{ ...blocked.parts[0], unitCost: -1 }] },
    { parts: [{ ...blocked.parts[0], name: "x".repeat(33) }] },
    { minutes: -1 },
    { elapsed: 60 },
    { total: 50 },
    { color: "red" },
    { style: "summary" },
  ])("rejects invalid or derived input %j", (edit) => {
    expect(props.safeParse({ ...blocked, ...edit }).success).toBe(false);
  });

  it("accepts inclusive bounds and adds no Writer fields for runtime data", () => {
    const tasks = Array(6).fill({ text: "x".repeat(36), required: false, done: false });
    const parts = Array(8).fill({ name: "x".repeat(32), qty: Number.MIN_VALUE, unitCost: 0 });
    expect(props.parse({ ...blocked, tasks, parts, note: "x".repeat(120) })).toMatchObject({
      style: "worksheet",
      detail: "full",
      lines: [...tasks.map(() => ({ kind: "task" })), ...parts.map(() => ({ kind: "part" }))],
    });
  });
});

describe("WorkOrder fallback", () => {
  it("respects the cast and falls back to neutral copy for empty or malformed casts", () => {
    const cast: CastLike = {
      things: [{ type: "job", fields: ["name"] }],
      items: [{ id: "one", type: "job", sample: true, name: "Check the connection" }],
    };
    const empty: CastLike = { things: [], items: [] };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, name: false }] };
    expect(fallback({ cast })).toMatchObject({
      title: "Check the connection",
      tasks: [{ text: "Check the connection", required: true, done: false }],
    });
    for (const cast of [empty, malformed])
      expect(props.parse(fallback({ cast }))).toMatchObject({
        title: "Item one",
        status: "ready",
        tasks: [{ text: "Item one", required: true, done: false }],
        parts: [],
      });
  });
});

describe("WorkOrder metadata", () => {
  it("preserves the core near miss, variant write and addressed read", () => {
    expect(meta).toMatchObject({ status: "ready", dense: true, weight: 3, tier: "phone" });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "WorkOrder" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "w1/r2/check", action: "check" } }),
      ]),
    );
    expect(createRegistry({ packs: ["requests"] }).ids.includes(meta.id)).toBe(packReady("requests"));
  });
});

const order = (input: object, state: StateName = "filled"): ScreenLike => ({
  id: "desk",
  components: [{ ...input, c: "WorkOrder", id: "w1", state }],
});
const defs = { WorkOrder: def };
const start = { address: "w1/clock", action: "start" };
const stop = { address: "w1/clock", action: "stop" };
const finish = { address: "w1/finish", action: "press" };
const check = { address: "w1/r2/check", action: "check" };
const blocker = (value: string) => ({ address: "w1/blocked", action: "select", value });
const note = (value: string) => ({ address: "w1/note", action: "type", value });
const qty = (value: number) => ({ address: "w1/r3/qty", action: "set", value });

describe("WorkOrder states, parts and actions", () => {
  it("adopts live blockers, notes, checks and part quantities without renumbering", () => {
    const screen = order(blocked);
    const act = (...steps: ActStep[]) => planAct(screen, defs, {}, steps);
    expect(act(start)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act(stop)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act(blocker("unknown"))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(act(note("x".repeat(121)))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(act(qty(0))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(act(check, finish)).toMatchObject({ ok: false, at: 1 });
    expect(act(blocker("none"), finish)).toMatchObject({ ok: false, at: 1 });
    const staged = act(blocker("none"), note("Restocked"), check, qty(2));
    expect(staged.ok).toBe(true);
    if (staged.ok) {
      const reading = readScreen(screen, defs, staged.values);
      for (const text of ["Restocked", '"LED grow light" ×2 $38', "[w1/finish press]", "check:done"])
        expect(reading).toContain(text);
      expect(reading).not.toContain("Blocker: parts");
    }
  });

  it("permits stop even after a blocker is added, and gates finish on the live clock and required checks", () => {
    const tasks = [...ready.tasks, { text: "Optional check", required: false, done: false }];
    const controller = createScreenController({ screen: order({ ...ready, tasks }), defs });
    expect(controller.act([check, start, finish])).toMatchObject({ ok: false, at: 2 });
    expect(controller.act([check, start, blocker("access")]).ok).toBe(true);
    expect(controller.act(stop).ok).toBe(true);
    expect(controller.act(finish).ok).toBe(false);
    expect(controller.act([blocker("none"), finish]).ok).toBe(true);
    controller.dispose();
  });

  it("uses the host’s permission for the addressed order and keeps the record host-owned", () => {
    let permission: boolean | undefined;
    const derive = WorkOrder.workOrderGates((id) => (id === "w1" ? permission : undefined));
    const hostDefs = { WorkOrder: { ...def, meta: { ...meta, live: { ...meta.live, derive } } } };
    const screen = order(ready);
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs: hostDefs, onAction });
    for (const step of [start, stop, finish, blocker("parts"), note("Draft"), check, qty(2)])
      expect(controller.act(step).ok).toBe(false);
    permission = true;
    expect(controller.act([check, finish]).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ address: "desk/w1/finish" }));
    expect(controller.snapshotScreen()).toEqual(screen);
    controller.dispose();
  });
});

describe("WorkOrder inactive states and brief detail", () => {
  it.each([
    [summary, "filled"],
    [{ ...summary, style: "worksheet" }, "filled"],
    [ready, "loading"],
    [ready, "success"],
    [ready, "error"],
  ] as const)("offers no edits for a read-only order or inactive state (%s, %s)", (input, state) => {
    for (const step of [start, stop, finish, blocker("parts"), note("Draft"), check, qty(2)])
      expect(planAct(order(input, state), defs, {}, [step])).toMatchObject({ code: "not_actionable" });
  });

  it("hides precisely the schedule and assignee in brief and preserves item addresses", () => {
    const full = readScreen(order(blocked), defs);
    const brief = readScreen(order({ ...blocked, detail: "brief" }), defs);
    expect(full).toContain("Assigned to Ella");
    expect(full).toContain("13:00–14:00");
    expect(brief).not.toMatch(/Ella|13:00/);
    expect(brief).toContain("[w1/r2/check check:todo]");
    expect(brief).toContain("[w1/r3/qty set");
  });
});
