import { z } from "zod";
import { expect, it } from "vitest";
import {
  parseControlProps,
  planAct,
  readScreen,
  text,
  type Definition,
  type Meta,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const rowSchema = z.strictObject({
  label: text(20),
  active: z.boolean(),
  saved: z.boolean(),
  slot: z.number(),
});
const props = z.strictObject({ rows: z.array(rowSchema) });
type Row = z.infer<typeof rowSchema> & { id: string; overlap?: boolean };
const rows = [
  { label: "First session", active: false, saved: true, slot: 1 },
  { label: "Second session", active: false, saved: true, slot: 1 },
  { label: "Later session", active: true, saved: false, slot: 2 },
];
const meta = {
  id: "Fixture",
  group: "content",
  purpose: "Read saved sessions",
  pick: "Read saved sessions",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local agenda",
  items: { key: "rows", parts: ["save", "open"], visibleWhen: { saved: true }, toggles: { save: "saved" } },
  actions: { items: { save: ["toggle"], open: ["press"] }, when: { open: { overlap: false } } },
  live: {
    derive: (input) => {
      const rows = input.rows as Row[];
      return {
        rows: rows.map((row) => ({
          ...row,
          overlap:
            row.saved && rows.some((other) => other.id !== row.id && other.saved && other.slot === row.slot),
        })),
      };
    },
  },
  read: (input) => (input.rows as Row[]).filter(({ overlap }) => overlap).map(({ id }) => `overlap ${id}`),
} satisfies Meta;
const defs = {
  Fixture: { meta, props, fallback: () => ({ rows }), examples: [], probes: [] },
} satisfies Record<string, Definition>;
const screen = { id: "home", components: [{ id: "s1", c: "Fixture", rows }] };
const save = { address: "home/s1/r1/save", action: "toggle" };
const openSecond = { address: "home/s1/r2/open", action: "press" };

it("drops an unsaved row and clears the remaining row's overlap in the next read", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain('"First session"');
  expect(before).toContain("overlap r2");
  expect(before).not.toContain('"Later session"');
  const result = planAct(screen, defs, {}, [{ ...save, value: false }]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.values[save.address]).toBe(false);
  const after = readScreen(screen, defs, result.values);
  expect(after).not.toContain('"First session"');
  expect(after).not.toContain("overlap");
  expect(after).not.toContain("[s1/r1/");
  expect(after).toContain('r2 "Second session"');
  expect(after).toContain("[s1/r2/open press]");
});

it("flips the declared field and uses the resulting offers during the same batch", () => {
  expect(readScreen(screen, defs)).toContain("[s1/r1/save toggle:on]");
  expect(planAct(screen, defs, {}, [openSecond])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(planAct(screen, defs, {}, [save, openSecond])).toMatchObject({
    ok: true,
    values: { [save.address]: false },
  });
  expect(planAct(screen, defs, {}, [save, save])).toMatchObject({
    ok: false,
    at: 1,
    code: "not_actionable",
  });
});

it("projects the same flags for the controller without changing its wire snapshot", () => {
  const controller = createScreenController({ screen, defs });
  try {
    expect(controller.actionsAt(openSecond.address)).toEqual([]);
    expect(controller.act(save).ok).toBe(true);
    expect(controller.read()).not.toContain("overlap");
    expect(controller.actionsAt(save.address)).toEqual([]);
    expect(controller.actionsAt(openSecond.address)).toEqual(["press"]);
    expect(controller.liveControls(meta, parseControlProps(defs.Fixture, { rows }), "s1").rows).toMatchObject(
      [
        { id: "r1", saved: false, overlap: false },
        { id: "r2", saved: true, overlap: false },
        { id: "r3", saved: false, overlap: false },
      ],
    );
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});

it("feeds plain read summaries and allows repeated flips when the row stays visible", () => {
  const {
    live: _live,
    items: { visibleWhen: _visibleWhen, ...items },
    ...plain
  } = meta;
  const unfiltered = {
    Fixture: {
      ...defs.Fixture,
      meta: {
        ...plain,
        items,
        read: (input) => [`saved ${(input as { rows: Row[] }).rows.filter(({ saved }) => saved).length}`],
      },
    },
  } satisfies Record<string, Definition>;
  expect(readScreen(screen, unfiltered)).toContain("saved 2");
  const first = planAct(screen, unfiltered, {}, [save]);
  if (!first.ok) throw new Error(first.code);
  expect(readScreen(screen, unfiltered, first.values)).toContain("saved 1");
  expect(readScreen(screen, unfiltered, first.values)).toContain("[s1/r1/save toggle:off]");
  const next = planAct(screen, unfiltered, first.values, [save]);
  if (!next.ok) throw new Error(next.code);
  expect(next.values[save.address]).toBe(true);
  expect(readScreen(screen, unfiltered, next.values)).toContain("saved 2");
});
