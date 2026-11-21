import { expect, it } from "vitest";
import { z } from "zod";
import { RequestResolution } from "../../../packs/requests";
import { writerFormatFor } from "../../format";
import type { Definition } from "../../probes";
import { text } from "../../props";
import { planAct, readScreen, type DeviceData, type ScreenLike } from "../index";

it("admits the staged Resolution outcome without changing its strict reason refinement", () => {
  const def: Definition = {
    ...RequestResolution,
    meta: {
      ...RequestResolution.meta,
      selections: {
        outcome: { prop: "outcome", choices: { prop: "outcome_choices" }, runtime: true },
      },
      live: {
        text: { reason: { prop: "reason", max: 120 } },
        derive: (props) => ({
          outcome_choices: [
            "repaired",
            "workaround",
            ...(String(props.reason ?? "").trim() ? ["unable"] : []),
          ],
        }),
      },
    },
  };
  const defs = { [def.meta.id]: def };
  const wire = RequestResolution.examples[0]!;
  const screen: ScreenLike = {
    id: "s",
    components: [{ id: "r", c: def.meta.id, ...wire }],
  };
  const pick = { address: "r/outcome", action: "select", value: "unable" };
  expect(def.props.safeParse({ ...wire, outcome: "unable" }).success).toBe(false);
  expect(planAct(screen, defs, {}, [pick]).ok).toBe(false);
  const edit = planAct(screen, defs, {}, [{ address: "r/reason", action: "type", value: "Cannot proceed" }]);
  expect(edit.ok).toBe(true);
  if (!edit.ok) return;
  expect(readScreen(screen, defs, edit.values)).toContain('choices ["repaired","workaround","unable"]');
  const select = planAct(screen, defs, edit.values, [pick]);
  expect(select.ok).toBe(true);
  if (!select.ok) return;
  expect(readScreen(screen, defs, select.values)).toContain('[r/outcome select = "unable"');
});

const viewerDef = {
  meta: {
    id: "ViewerFixture",
    group: "input",
    purpose: "Edit your own response.",
    pick: "Edit your own response.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Responses on this device.",
    items: { key: "rows", parts: ["root"] },
    actions: { items: { root: ["select"] }, when: { "root.select": { own: true } } },
    selections: {
      r1: { prop: "first", choices: { prop: "answers" }, runtime: true },
      r2: { prop: "second", choices: { prop: "answers" }, runtime: true },
    },
    deviceData: ["viewer"],
    live: {
      derive: (props, _instance, data) => {
        expect(Object.keys(data).every((key) => key === "viewer")).toBe(true);
        const [viewer] = data.viewer ?? [];
        return {
          rows: (props.rows as { id: string; name: string }[]).map((row) => ({
            ...row,
            own: viewer === row.id,
          })),
          answers: ["yes", "maybe", "no"],
        };
      },
    },
  },
  props: z.strictObject({ rows: z.array(z.strictObject({ name: text(20) })) }),
  fallback: () => ({ rows: [] }),
  examples: [],
  probes: [],
} satisfies Definition;

it("uses only the host's current viewer to offer and admit selections", () => {
  const defs = { ViewerFixture: viewerDef };
  const rows = [{ name: "First" }, { name: "Second" }];
  const screen = { id: "s", components: [{ id: "entry", c: viewerDef.meta.id, rows }] };
  const forged = { "s/entry/$deviceData": { viewer: ["r1"] }, "s/entry/viewer": "r1" };
  const step = (row: number, value: string) => ({ address: `entry/r${row}`, action: "select", value });
  const plan = (row: number, value: string, data?: DeviceData) =>
    planAct(screen, defs, forged, [step(row, value)], null, "planner", data);
  expect(viewerDef.props.safeParse({ rows, viewer: "r1" }).success).toBe(false);
  expect(Object.keys(writerFormatFor(viewerDef).json_schema.schema.properties ?? {})).toEqual(["c", "rows"]);
  expect(readScreen(screen, defs, forged)).not.toContain(" select");
  expect(plan(1, "yes")).toMatchObject({ ok: false, code: "not_actionable" });
  const host = { viewer: ["r2"], unrelated: ["r1"] };
  const reading = readScreen(screen, defs, forged, undefined, host);
  expect(reading).toContain('[entry/r2 select choices ["yes","maybe","no"]]');
  expect(reading).not.toContain("[entry/r1 select");
  expect(plan(1, "yes", host)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(plan(2, "other", host)).toMatchObject({ ok: false, code: "invalid_value" });
  expect(plan(2, "yes", host)).toMatchObject({ ok: true, values: { "s/entry/$selection/second": "yes" } });
  expect(plan(2, "yes", { viewer: ["r1"] })).toMatchObject({ ok: false, code: "not_actionable" });
});
