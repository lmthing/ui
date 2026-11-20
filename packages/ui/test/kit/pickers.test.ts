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

it("rejects a schema-incompatible wire sort without throwing", () => {
  const definition = defs.PickerFixture;
  const wireSort = {
    PickerFixture: {
      ...definition,
      meta: {
        ...definition.meta,
        selections: {
          sort: { prop: "order", choices: ["random"] },
        },
      },
    },
  };
  expect(planAct(screen, wireSort, {}, [{ ...sort, value: "random" }])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});

it("does not offer picker-only actions while loading", () => {
  const definition = defs.PickerFixture;
  const { live: _live, clear: _clear, ...meta } = definition.meta;
  const pickerOnly = { PickerFixture: { ...definition, meta } };
  const loading = { ...screen, components: [{ ...screen.components[0]!, state: "loading" as const }] };
  expect(planAct(loading, pickerOnly, {}, [open])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(planAct(loading, pickerOnly, {}, [room("Study")])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("treats a picker label as authoritative if it collides with another option's value", () => {
  const entry = screen.components[0]!;
  const filters = [
    {
      title: "Room",
      choices: [
        { value: "study", label: "Study" },
        { value: "Study", label: "Office" },
      ],
    },
  ];
  const changedScreen = { ...screen, components: [{ ...entry, filters }] };
  const plan = planAct(changedScreen, defs, {}, [room("Study")]);
  expect(plan).toMatchObject({ ok: true, values: { [part("r1")]: "study" } });
  if (plan.ok)
    expect(readScreen(changedScreen, defs, plan.values)).toContain(
      '[filters/r1 select = "Study"; choices ["Study","Office"]]',
    );
});
