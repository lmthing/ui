import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const { Scope, Milestones } = components;
const { props, examples, fallback, probes } = Scope;
const first = examples[2]!,
  baseline = examples[1]!;
const row = first.deliverables[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const check = { address: "s1/r1/accept", action: "check" };
const remove = { address: "s1/r1/remove", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const screen = (input: object = first, state: StateName = "filled") => ({
  id: "scope",
  components: [{ ...input, c: "Scope", id: "s1", state }],
});
const address = (target: string) => `home/s1/${target}`;
const draw = (input: object, state: StateName = "filled") =>
  addressedElements(renderExample("Scope", input, state, theme, { component: "s1" }).html);
describe("Scope contract and fallback", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));
  it("enforces exact collection, text and revision limits", () => {
    const deliverables = Array.from({ length: 7 }, (_, i) => ({
      ...row,
      title: "x".repeat(32),
      acceptance: "y".repeat(100),
      deliverableRef: `item_${i}`,
    }));
    const excluded = Array(6).fill("z".repeat(60));
    expect(
      props.safeParse({ ...first, revision: 99, deliverables: deliverables.slice(0, 6), excluded }).success,
    ).toBe(true);
    for (const changes of [
      { deliverables },
      { deliverables: [] },
      { deliverables: [row, row] },
      { deliverables: [{ ...row, acceptance: "x".repeat(101) }] },
      { deliverables: [{ ...row, acceptedAt: "2026-02-29" }] },
      { excluded: [...excluded, "one more"] },
      { excluded: ["x".repeat(61)] },
      { revision: 0 },
      { revision: 100 },
      { revision: 1.5 },
      { accepted: 1 },
      { color: "red" },
    ])
      expect(props.safeParse({ ...first, ...changes }).success).toBe(false);
  });
  it("uses cast text and placeholders, and keeps the core near miss and variant probe", () => {
    const cast = (label: unknown, detail: unknown = "Must be legible") => ({
      things: [{ type: "record", fields: ["label", "detail"] }],
      items: [{ id: "output", type: "record", sample: true, label, detail }],
    });
    expect(props.parse(fallback({ cast: cast("The map") })).deliverables[0]).toMatchObject({
      title: "The map",
      acceptance: "Must be legible",
    });
    for (const empty of [{ things: [], items: [] }, cast(false, false)])
      expect(props.parse(fallback({ cast: empty })).deliverables[0]?.title).toBe("Item one");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(createRegistry({ packs: ["projects"] }).ids.includes("Scope")).toBe(packReady("projects"));
  });
});
describe("Scope states and addresses", () => {
  it("keeps stable addresses in compact density and hides only dates in brief detail", () => {
    const keys = (value: object) => [...draw(value).keys()];
    const full = keys(first);
    expect(full).toContain(address("r1/due"));
    expect(full).toContain(address("r2/accepted_at"));
    expect(keys({ ...first, density: "compact" })).toEqual(full);
    expect(keys({ ...first, detail: "brief" })).toEqual(
      full.filter((part) => !/\/(due|accepted_at)$/.test(part)),
    );
    const read = readComponent(Scope, { ...first, detail: "brief" }, "s1").join("\n");
    expect(read).toContain(first.deliverables[0]!.acceptance);
    expect(read).not.toMatch(/2026-11-(?:18|20)/);
  });
  it("has an inert loading state, shared empty state and honest completion feedback", () => {
    const loading = draw(first, "loading");
    expect(loading.has(address("r1/accept"))).toBe(false);
    expect(loading.get(address("r1/remove"))?.attributes).not.toContain('role="button"');
    expect([...draw(first, "empty").keys()]).toEqual([address("root"), address("empty")]);
    expect(draw(first, "success").has(address("complete"))).toBe(false);
    expect(draw(examples[0]!, "success").get(address("accepted"))?.text).toEqual(["2 of 2"]);
    expect(draw(baseline, "success").get(address("complete"))?.text).toEqual(["All deliverables accepted"]);
  });
  it("shows and reads exclusions only for baseline style", () => {
    const printed = "Printing and binding";
    for (const style of ["deliverables", "baseline"] as const) {
      const input = { ...baseline, style };
      const read = readComponent(Scope, input, "s1").join("\n");
      expect(draw(input).has(address("excluded"))).toBe(style === "baseline");
      expect(read.includes(printed)).toBe(style === "baseline");
    }
  });
});
describe("Scope confirmed edits", () => {
  it("confirms acceptance and clearing, atomically advances revision and updates a linked milestone", () => {
    const store = createInteractionStore();
    const deviceData = {
      project_calendar: [{ timeZone: "America/New_York", projectRef: first.projectRef, date: "2026-11-18" }],
    };
    const now = () => Date.parse("2026-11-19T02:00:00Z");
    const controller = createScreenController({ screen: screen(), defs: { Scope }, store, now, deviceData });
    const observer = createScreenController({
      screen: { id: "plan", components: [{ c: "Milestones", id: "m1", ...Milestones.examples[0] }] },
      defs: { Milestones },
      store,
      now,
      deviceData,
    });
    try {
      expect(controller.act(check).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]!.revision).toBe(1);
      expect(controller.act(cancel).ok).toBe(true);
      expect(observer.read()).toContain("Still needed");
      expect(controller.act([check, confirm], { dryRun: true }).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]!.revision).toBe(1);
      expect(controller.act([check, confirm]).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]).toMatchObject({
        revision: 2,
        deliverables: [expect.objectContaining({ acceptedAt: "2026-11-18" }), expect.anything()],
      });
      expect(controller.read()).toContain("All deliverables accepted");
      expect(observer.read()).toContain("Reached 18 Nov 2026");
      expect(controller.act({ ...check, value: true }).ok).toBe(false);
      expect(controller.act([{ ...check, value: false }, confirm]).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]!.revision).toBe(3);
      expect(controller.read()).toContain("1 of 2 accepted");
      expect(observer.read()).toContain("Still needed");
      expect(observer.read()).not.toContain("Reached 18 Nov 2026");
    } finally {
      controller.dispose();
      observer.dispose();
    }
  });
});

describe("Scope guarded removal", () => {
  it("rechecks same-project gates at confirmation, then removes without retargeting survivors", () => {
    const deviceData = { project_milestones: [] as { projectRef: string; requires: string[] }[] };
    const onLink = vi.fn();
    const controller = createScreenController({ screen: screen(), defs: { Scope }, deviceData, onLink });
    try {
      expect(controller.act(remove).ok).toBe(true);
      deviceData.project_milestones.push({ projectRef: first.projectRef, requires: [row.deliverableRef] });
      expect(controller.act(confirm).ok).toBe(false);
      expect(controller.act(cancel).ok).toBe(true);
      expect(controller.read()).not.toContain("[s1/r1/remove");
      deviceData.project_milestones[0]!.projectRef = "elsewhere";
      expect(controller.act([remove, confirm]).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]).toMatchObject({
        revision: 2,
        deliverables: [first.deliverables[1]],
      });
      expect(controller.read()).toContain("[s1/r2/accept check:done]");
      expect(controller.read()).not.toMatch(/\[s1\/r[12]\/remove/);
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      controller.dispose();
    }
  });
});

it("offers navigation independently of edit limits, host dependencies and presentation state", () => {
  const deviceData = {
    project_milestones: [{ projectRef: first.projectRef, requires: [row.deliverableRef] }],
  };
  const guarded = addressedElements(
    renderInstance("Scope", first, "filled", theme, { component: "s1", deviceData }),
  );
  expect(guarded.has(address("r1/remove"))).toBe(false);
  expect(guarded.has(address("r2/remove"))).toBe(true);
  const atLimit = { ...first, revision: 99 };
  expect(draw(atLimit).get(address("r1/accept"))?.attributes).toContain('aria-disabled="true"');
  const act = (input: object, step: typeof check, state?: StateName) =>
    planAct(screen(input, state), { Scope }, {}, [step]);
  expect(act(atLimit, check).ok).toBe(false);
  expect(act(atLimit, remove).ok).toBe(false);
  expect(act(atLimit, { address: "s1/r1", action: "press" })).toMatchObject({
    ok: true,
    links: [{ goto: "light_map" }],
  });
  for (const state of ["empty", "loading"] as const)
    for (const step of [check, remove, { address: "s1/r1", action: "press" }])
      expect(act(first, step, state).ok).toBe(false);
});
