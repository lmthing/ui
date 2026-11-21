import { z } from "zod";
import { expect, it, vi } from "vitest";
import { parseControlProps, text, type Definition, type Meta } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const rows = [
  { label: "First", active: true },
  { label: "Second", active: true },
];
const schema = z.strictObject({
  rows: z.array(z.strictObject({ label: text(20), active: z.boolean() })),
});
const second = "home/f1/r2";
const details = { address: `${second}/details`, action: "press" };
const toggle = { address: second, action: "toggle" };

function fixture(source: "wire" | "parsed" | "live", action: "toggle" | "select") {
  const key = source === "wire" ? "rows" : "viewRows";
  const meta = {
    id: "Fixture",
    group: "input",
    purpose: "Disclose details",
    pick: "Disclose details",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local disclosure",
    items: { key, parts: ["root", "details"] },
    actions: { items: { root: [action], details: ["press"] }, when: { details: { expanded: true } } },
    select: { prop: "expanded", value: { field: "label" }, mode: "flags", runtime: true },
    read: (input) => {
      const items = (input as Record<string, { id: string; expanded: boolean }[]>)[key]!;
      return items.filter(({ expanded }) => expanded).map(({ id }) => `opened ${id}`);
    },
    ...(source === "live"
      ? { live: { derive: () => ({ viewRows: rows.map((row, i) => ({ ...row, id: `r${i + 1}` })) }) } }
      : {}),
  } satisfies Meta;
  const def = {
    meta,
    props: source === "parsed" ? schema.overwrite((input) => ({ ...input, viewRows: input.rows })) : schema,
    fallback: () => ({ rows }),
    examples: [],
    probes: [],
  } satisfies Definition;
  const screen = { id: "home", components: [{ id: "f1", c: meta.id, rows }] };
  const onChange = vi.fn();
  const controller = createScreenController({
    screen,
    defs: { Fixture: def },
    onChange,
    requireMounted: true,
  });
  controller.registerPart("home/f1/r1");
  controller.registerPart(second);
  const view = () => controller.liveControls(meta, parseControlProps(def, { rows }), "f1")[key];
  return { controller, def, onChange, screen, view };
}

it.each(["wire", "parsed", "live"] as const)("keeps %s flag rows out of wire snapshots", (source) => {
  const { controller, def, onChange, screen, view } = fixture(source, "toggle");
  const wire = controller.snapshotScreen();
  const { id: _id, c: _c, ...input } = wire.components[0]!;
  expect(() => def.props.parse(input)).not.toThrow();
  expect(wire).toEqual(screen);
  expect(view()).toMatchObject([
    { id: "r1", expanded: false },
    { id: "r2", expanded: false },
  ]);
  expect(controller.read()).toContain("[f1/r2 toggle:off]");
  expect(controller.act(details)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(controller.act([toggle, details], { dryRun: true })).toMatchObject({ ok: true });
  expect(onChange).not.toHaveBeenCalled();
  expect(controller.press(second).ok).toBe(true);
  expect(view()).toMatchObject([{ expanded: false }, { expanded: true }]);
  expect(controller.read()).toContain("opened r2");
  expect(controller.read()).toContain("[f1/r2 toggle:on]");
  expect(controller.actionsAt(details.address)).toEqual(["press"]);
  controller.registerPart(details.address);
  expect(controller.act(details).ok).toBe(true);
  expect(controller.snapshotScreen()).toEqual(screen);
  expect(onChange.mock.calls.map(([snapshot]) => snapshot)).toEqual([screen, screen]);
  expect(controller.act(toggle).ok).toBe(true);
  expect(controller.read()).not.toContain("opened r2");
  expect(controller.act(details)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(controller.snapshotScreen()).toEqual(screen);
  controller.dispose();
});

it("selects a derived row and clears the previous flag without persisting either", () => {
  const { controller, screen, view } = fixture("live", "select");
  expect(controller.act({ address: second, action: "select" }).ok).toBe(true);
  expect(controller.read()).toContain("opened r2");
  expect(controller.act({ address: "home/f1/r1", action: "select", value: "First" }).ok).toBe(true);
  expect(view()).toMatchObject([{ expanded: true }, { expanded: false }]);
  expect(controller.read()).toContain("opened r1");
  expect(controller.read()).not.toContain("opened r2");
  expect(controller.snapshotScreen()).toEqual(screen);
  controller.dispose();
});
