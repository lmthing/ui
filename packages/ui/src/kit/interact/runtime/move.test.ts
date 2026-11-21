import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../../catalog";
import { createScreenController } from "../index";

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
