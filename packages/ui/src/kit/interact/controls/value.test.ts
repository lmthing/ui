import { expect, it } from "vitest";
import { components, type Definition, type Values, type ActStep, type ScreenLike } from "@lmthing/ui/catalog";
import { z } from "zod";
import { controlStep, createScreenController } from "../index";
function value(c: keyof typeof components, raw: Values, step: ActStep) {
  if (c === "Composer") raw = { hint: "Reply", ...raw };
  const entry = { id: "c1", c, ...raw };
  const screen: ScreenLike = { id: "test", components: [entry] };
  return controlStep(screen, entry, components[c]!.props.parse(raw) as Values, components, {}, step, 1000);
}
it("rejects unsafe counter values and keeps fixed steps", () => {
  expect(
    value("Counter", { label: "Count", value: 2, step: 3 }, { address: "c1/plus", action: "increment" })
      .value,
  ).toBe(5);
  expect(
    value("Counter", { label: "Count", value: 2, step: 3 }, { address: "c1/minus", action: "decrement" }),
  ).toMatchObject({ disabled: true, values: {} });
});
it("enforces composer limits and clears exact, nonempty sends", () => {
  expect(
    value("Composer", { max: 600 }, { address: "c1/field", action: "type", value: "a".repeat(601) }),
  ).toMatchObject({ error: "The text is over this composer limit", values: {} });
  expect(value("Composer", { value: "  " }, { address: "c1/send", action: "send" })).toMatchObject({
    disabled: true,
    values: {},
  });
  expect(value("Composer", { value: " Exact\n" }, { address: "c1/send", action: "send" })).toMatchObject({
    values: { "test/c1/field": "" },
    send: { text: " Exact\n", address: "test/c1/field" },
  });
});
it("rejects contradictory scale levels and stages timer start/stop data", () => {
  expect(value("Scale", { label: "Level" }, { address: "c1/l1", action: "select", value: 5 })).toMatchObject({
    error: "Choose an editable level from one to five",
    values: {},
  });
  for (const action of ["start", "stop"])
    expect(
      value("Timer", { label: "Elapsed", style: "up", seconds: 10 }, { address: `c1/${action}`, action })
        .values,
    ).toMatchObject({
      "test/c1/$timer": { running: action === "start", from: 1000, seconds: 10 },
      "test/c1/$seconds": 10,
    });
});

it("commits enum moves at the mounted row root and keeps dry runs and failed batches off the wire", () => {
  const def = {
    meta: {
      id: "MoveFixture",
      group: "data",
      purpose: "Move records between stages.",
      pick: "A controller fixture.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Local.",
      items: {
        key: "rows",
        parts: ["root"],
        visibleWhen: { active: true },
        move: { field: "stage", values: ["queued", "working", "done"] },
      },
      actions: { items: { root: ["move"] } },
    },
    props: z.strictObject({
      rows: z.array(
        z.strictObject({
          title: z.string(),
          active: z.boolean(),
          stage: z.enum(["queued", "working", "done"]),
        }),
      ),
    }),
    fallback: () => ({}),
    examples: [],
    probes: [],
  } satisfies Definition;
  const hidden = { title: "One", active: false, stage: "done" };
  const active = { title: "Two", active: true, stage: "queued" };
  const entry = { id: "b1", c: def.meta.id, rows: [hidden, active] };
  const screen = { id: "home", components: [entry] };
  const controller = createScreenController({ screen, defs: { [def.meta.id]: def }, requireMounted: true });
  const move = { address: "b1/r2", action: "move", value: "working" };
  expect(controller.actionsAt("b1/r1")).toEqual([]);
  expect(controller.actionsAt("b1/r2")).toEqual(["move"]);
  expect(controller.act(move)).toMatchObject({ ok: false, code: "not_mounted" });
  controller.registerPart("b1/r2");
  expect(controller.act(move, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
  expect(controller.act([move, { ...move, value: "gone" }])).toMatchObject({
    ok: false,
    code: "invalid_value",
    at: 1,
  });
  expect(controller.snapshotScreen()).toEqual(screen);
  expect(controller.act(move)).toMatchObject({ ok: true, changed: 'b1/r2 move = "working"' });
  expect(controller.snapshotScreen().components).toEqual([
    { ...entry, rows: [hidden, { ...active, stage: "working" }] },
  ]);
  expect(controller.read()).toContain('[b1/r2 move = "working"; choices ["queued","done"]]');
  expect(entry.rows).toEqual([hidden, { ...active, stage: "queued" }]);
  controller.dispose();
});
