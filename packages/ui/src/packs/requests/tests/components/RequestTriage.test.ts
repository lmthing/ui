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
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { RequestTriage } from "../../components";

const def = components.RequestTriage;
const { meta, props, fallback, examples, probes } = def;
const { requestTriageGates } = RequestTriage;
const route = examples[0]!;
const duplicate = examples[1]!;
const target = duplicate.duplicates[0]!;

describe("RequestTriage contract and boundaries", () => {
  it.each(examples)("accepts each example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { number: "x".repeat(13) },
    { title: "x".repeat(33) },
    { reportedUrgency: "critical" },
    { priority: "critical" },
    { impact: "city" },
    { queues: [] },
    { queues: Array(7).fill({ label: "Queue" }) },
    { queues: [{ label: "x".repeat(21) }] },
    { at: -1 },
    { at: 1 },
    { at: 0.5 },
    { duplicates: Array(7).fill(target) },
    { duplicates: [{ ...target, goto: "https://example.org" }] },
    { duplicateAt: 1 },
    { reason: " ".repeat(2) },
    { reason: undefined },
    { reason: "x".repeat(121) },
    { number: target.number },
    { apply: 0 },
    { canTriage: true },
    { density: "roomy" },
    { color: "red" },
  ])("rejects invalid input %j", (edit) => {
    expect(props.safeParse({ ...duplicate, ...edit }).success).toBe(false);
  });

  it("accepts the inclusive limits and defaults priority", () => {
    expect(
      props.parse({
        ...duplicate,
        number: "x".repeat(12),
        title: "x".repeat(32),
        queues: Array(6).fill({ label: "x".repeat(20) }),
        duplicates: Array(6).fill({ number: "y".repeat(12), title: "y".repeat(32), goto: "x".repeat(64) }),
        at: 5,
        duplicateAt: 5,
        reason: "x".repeat(120),
        priority: undefined,
      }),
    ).toMatchObject({ priority: "normal", apply: 11 });
  });
});

describe("RequestTriage metadata", () => {
  it("keeps the Field/choice near miss, decision-only write and addressed read", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.confirmParts).toEqual(["apply"]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: meta.id }),
        expect.objectContaining({ kind: "choose", expect: "Field" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/apply", action: "press" } }),
      ]),
    );
    const registry = createRegistry({ packs: ["requests"] });
    expect(registry.ids.includes(meta.id)).toBe(packReady("requests"));
  });
});

describe("RequestTriage fallback", () => {
  const empty: CastLike = { things: [], items: [] };
  const matching: CastLike = {
    things: [{ type: "report", fields: ["title", "team"] }],
    items: [{ id: "report", type: "report", sample: true, title: "Wall leak", team: "Maintenance" }],
  };
  const malformed: CastLike = {
    things: matching.things,
    items: [{ ...matching.items[0]!, title: 4, team: " " }],
  };

  it("uses neutral placeholders or takes bounded content from the cast", () => {
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({
      title: "Item one",
      queues: [{ label: "Item two" }],
      duplicates: [],
    });
    expect(fallback({ cast: matching })).toMatchObject({
      title: "Wall leak",
      queues: [{ label: "Maintenance" }],
    });
  });
});

function fixture(
  input = {
    ...duplicate,
    duplicateAt: undefined as number | undefined,
    reason: undefined as string | undefined,
  },
) {
  const facts = { staff: true, exists: true, canonical: true, cycle: false };
  const derive = requestTriageGates((id) =>
    id === "t1"
      ? {
          canTriage: facts.staff,
          canLink: (row) => row.number === target.number && facts.exists && facts.canonical && !facts.cycle,
        }
      : undefined,
  );
  const defs = { RequestTriage: { ...def, meta: { ...meta, live: { ...meta.live, derive } } } };
  const screen: ScreenLike = { id: "desk", components: [{ ...input, c: meta.id, id: "t1" }] };
  return { defs, screen, facts };
}
const queue = { address: "t1/r1", action: "select" };
const open = { address: "t1/r2", action: "press" };
const link = { address: "t1/r2/link", action: "select" };
const save = { address: "t1/apply", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const type = (value: string) => ({ address: "t1/reason", action: "type", value });
const priority = (value: string) => ({ address: "t1/priority", action: "select", value });

describe("RequestTriage read and act", () => {
  it("offers separate open and link actions, and applies only the current staged choice", () => {
    const { defs, screen } = fixture();
    const act = (...steps: ActStep[]) => planAct(screen, defs, {}, steps);
    expect(act(open)).toMatchObject({ ok: true, links: [{ goto: target.goto }] });
    expect(act(link)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act(save)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act(type(" "), link)).toMatchObject({ ok: false, at: 1 });
    expect(act(type("x".repeat(121)))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(act(priority("critical"))).toMatchObject({ ok: false, code: "invalid_value" });
    const staged = act(type("Same report."), link, priority("low"), queue, save);
    expect(staged).toMatchObject({ ok: true, links: [] });
    if (staged.ok) {
      const reading = readScreen(screen, defs, staged.values);
      expect(reading).toContain("Selected: Facilities; apply to save");
      expect(reading).toContain("low");
      expect(reading).not.toContain(duplicate.title);
    }
  });

  it.each(["staff", "exists", "canonical", "cycle"] as const)(
    "rechecks %s at confirmation without applying the duplicate early",
    (gate) => {
      const { defs, screen, facts } = fixture();
      const onAction = vi.fn();
      const controller = createScreenController({ screen, defs, onAction });
      expect(controller.act([type("Same report."), link, save]).ok).toBe(true);
      expect(controller.confirmation).toBeDefined();
      expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ address: "desk/t1/apply" }));
      expect(controller.snapshotScreen()).toEqual(screen);
      facts[gate] = gate === "cycle";
      expect(controller.act(confirm).ok).toBe(false);
      expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ address: "desk/t1/apply" }));
    },
  );

  it("commits only after confirmation and blocks edits for an unauthorized operator", () => {
    const { defs, screen, facts } = fixture();
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs, onAction });
    facts.staff = false;
    for (const step of [queue, type("Same report."), priority("low"), link, save])
      expect(controller.act(step).ok).toBe(false);
    expect(controller.act(open).ok).toBe(true);
    facts.staff = true;
    expect(controller.act([queue, save]).ok).toBe(true);
    expect(controller.act(confirm).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ address: "desk/t1/apply" }));
  });

  it.each(["loading", "success", "error"] as const)("does not offer edits or links in %s", (state) => {
    const screen: ScreenLike = { id: "desk", components: [{ ...route, id: "t1", c: meta.id, state }] };
    const defs = { RequestTriage: def };
    expect(readScreen(screen, defs)).toContain(`(${state})`);
    for (const step of [queue, open, priority("low"), type("note"), save])
      expect(planAct(screen, defs, {}, [step])).toMatchObject({ ok: false, code: "not_actionable" });
  });
});
