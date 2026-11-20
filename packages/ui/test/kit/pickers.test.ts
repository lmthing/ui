import { expect, it } from "vitest";
import { planAct, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { defs, part, screen } from "./pickers.fixture";

const search = { address: part("field"), action: "type", value: "Palm" };
const clear = { address: part("clear"), action: "press" };
const room = (value?: string) => ({ address: part("r1/root"), action: "select", value });
const light = { address: part("r2/root"), action: "select", value: "Low light" };
const sort = { address: part("sort"), action: "select", value: "Oldest first" };
const open = { address: part("r1/root"), action: "press" };

it("offers each picker independently, including its labels before disclosure", () => {
  const read = readScreen(screen, defs);
  expect(read).toContain('[filters/r1 select = "Study"; choices ["Study","Living room"]]');
  expect(read).toContain('[filters/r2 select choices ["Low light","Bright"]]');
  expect(planAct(screen, defs, {}, [room("Bright")])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(planAct(screen, defs, {}, [room()])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(planAct(screen, defs, {}, [open])).toMatchObject({ ok: true, values: { [part("$picker")]: "r1" } });
  const plan = planAct(screen, defs, {}, [open, room("Living room"), light]);
  expect(plan).toMatchObject({ ok: true, values: { [part("$picker")]: undefined, [part("r2")]: "shade" } });
  if (plan.ok) expect(readScreen(screen, defs, plan.values)).toContain('[filters/r2 select = "Low light";');
});

it("clears live and seeded inputs in one commit, keeping sort and dropping errors", () => {
  const controller = createScreenController({ screen, defs });
  try {
    expect(controller.act([search, room("Living room"), light, sort, open]).ok).toBe(true);
    expect(controller.edit(part("field"), "x".repeat(25)).ok).toBe(false);
    const before = controller.store.snapshot();
    expect(controller.act(clear, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
    expect(controller.act([clear, room("Bright")])).toMatchObject({ ok: false, at: 1 });
    expect(controller.store.snapshot()).toEqual(before);
    const snapshots: string[] = [];
    const unsubscribe = controller.store.subscribe(() => snapshots.push(controller.read()));
    expect(controller.press(clear.address).ok).toBe(true);
    unsubscribe();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toContain('[filters/field type = ""]');
    expect(snapshots[0]).toContain('[filters/r1 select choices ["Study","Living room"]]');
    expect(snapshots[0]).toContain('[filters/r2 select choices ["Low light","Bright"]]');
    expect(snapshots[0]).toContain('[filters/sort select = "Oldest first";');
    expect(controller.store.get(part("field/$draft"))).toBeUndefined();
    expect(controller.store.get(part("field/$error"))).toBeUndefined();
    expect(controller.store.get(part("$picker"))).toBeUndefined();
    expect(controller.snapshotScreen().components).toEqual(screen.components);
    expect(controller.act([open, clear]).ok).toBe(true);
    expect(controller.read()).toBe(snapshots[0]);
  } finally {
    controller.dispose();
  }
});
