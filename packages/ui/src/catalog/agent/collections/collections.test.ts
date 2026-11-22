import { expect, it } from "vitest";
import { z } from "zod";
import { text } from "../../props";
import type { Definition } from "../../probes";
import { parseControlProps, planAct, readScreen, slotMoveOffer, type ActStep, type Values } from "../index";

const row = z.strictObject({
  key: z.string(),
  title: text(30),
  shown: z.boolean(),
  saved: z.boolean(),
  locked: z.boolean(),
  kind: z.enum(["a", "b"]),
});
const def = {
  meta: {
    id: "CollectionsFixture",
    group: "data",
    purpose: "Offer separate rows.",
    pick: "Fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local.",
    collections: {
      first: {
        key: "cards",
        prefix: "card",
        identity: "key",
        parts: ["root", "save", "swap", "reorder"],
        actions: { root: ["select"], save: ["toggle"], swap: ["move"], reorder: ["move"] },
        select: { prop: "card", field: "key" },
        toggles: { save: "saved" },
        visibleWhen: { shown: true },
        slotMoves: {
          swap: { mode: "swap", locked: "locked", allows: (from, to) => from.kind === to.kind },
          reorder: { mode: "reorder", locked: "locked" },
        },
      },
      second: {
        key: "links",
        prefix: "link",
        identity: "key",
        parts: ["root", "save"],
        actions: { root: ["select"], save: ["check"] },
        select: { prop: "link" },
        toggles: { save: "saved" },
        when: { "save.check": { card: "a" } },
      },
    },
    read: (props) => {
      const { card, link } = props as Values;
      return [`card ${card ?? "-"}, link ${link ?? "-"}`];
    },
  },
  props: z.strictObject({ cards: z.array(row), links: z.array(row) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { CollectionsFixture: def };
const makeRow = (key: string, fields: Partial<z.output<typeof row>> = {}) => ({
  key,
  title: `Title ${key}`,
  shown: true,
  saved: false,
  locked: false,
  kind: "a" as const,
  ...fields,
});
const seed = {
  id: "c1",
  c: def.meta.id,
  cards: [
    makeRow("a"),
    makeRow("b", { locked: true }),
    makeRow("c"),
    makeRow("d", { kind: "b" }),
    makeRow("e", { shown: false }),
  ],
  links: [makeRow("a", { title: "Other A" })],
};
const screen = { id: "home", components: [seed] };
const step = (target: string, action: string, value?: unknown): ActStep => ({
  address: `home/c1/${target}`,
  action,
  value,
});
const order = (value: string) =>
  value.split("\n").flatMap((line) => line.match(/^  (r_card_\w+) /)?.[1] ?? []);

it("keeps simultaneous row actions, selection and flags independent across filtering and replacement", () => {
  const current = readScreen(screen, defs);
  expect(current).toContain('r_card_a "Title a" [c1/r_card_a select]');
  expect(current).toContain('r_link_a "Other A" [c1/r_link_a select]');
  expect(current).not.toContain("r_card_e");
  expect(current).not.toContain("r_link_a/save");
  const plan = planAct(screen, defs, {}, [
    step("r_card_a", "select"),
    step("r_link_a", "select"),
    step("r_link_a/save", "check"),
    step("r_card_a/save", "toggle"),
  ]);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  const refreshed = {
    ...screen,
    components: [{ ...seed, cards: [makeRow("new"), ...[...seed.cards].reverse()] }],
  };
  const read = readScreen(refreshed, defs, plan.values);
  expect(read).toContain("card a, link r_link_a");
  expect(read).toContain('[c1/r_card_a select = "a"] [c1/r_card_a/save toggle:on]');
  expect(read).toContain("[c1/r_link_a/save check:done]");
  expect(read).toContain("[c1/r_card_new/save toggle:off]");
  expect(planAct(screen, defs, {}, [step("r_card_a", "select", "b")])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  expect(planAct(screen, defs, {}, [step("r_card_e/save", "toggle")])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("swaps compatible slots and reorders by destination id without restamping", () => {
  const plan = planAct(screen, defs, {}, [
    step("r_card_a/swap", "move", "r_card_c"),
    step("r_card_a/reorder", "move", "r_card_d"),
    step("r_card_a", "select"),
    step("r_card_a/save", "toggle"),
  ]);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  const read = readScreen(screen, defs, plan.values);
  expect(order(read)).toEqual(["r_card_c", "r_card_b", "r_card_d", "r_card_a"]);
  expect(read).toContain('r_card_a "Title a" [c1/r_card_a select = "a"] [c1/r_card_a/save toggle:on]');
  expect(order(readScreen(screen, defs))).toEqual(["r_card_a", "r_card_b", "r_card_c", "r_card_d"]);
  expect(seed.cards.map(({ key }) => key)).toEqual(["a", "b", "c", "d", "e"]);
});

it("rechecks locks, compatibility and visibility, including displacements and stale targets", () => {
  const current = readScreen(screen, defs);
  expect(current).toContain('[c1/r_card_a/swap move = "r_card_a"; choices ["r_card_c"]]');
  expect(current).not.toContain("r_card_a/reorder");
  const values = {};
  for (const destination of ["r_card_b", "r_card_d", "r_card_e", "r_card_missing"]) {
    expect(
      planAct(screen, defs, values, [
        step("r_card_c/reorder", "move", "r_card_d"),
        step("r_card_a/swap", "move", destination),
      ]),
    ).toMatchObject({ ok: false, at: 1, code: "invalid_value" });
  }
  expect(values).toEqual({});
  const replaced = {
    ...screen,
    components: [{ ...seed, cards: [...seed.cards.slice(0, 2), makeRow("other"), ...seed.cards.slice(3)] }],
  };
  expect(planAct(replaced, defs, {}, [step("r_card_a/swap", "move", "r_card_c")])).toMatchObject({
    ok: false,
  });
  const locked = {
    ...screen,
    components: [
      { ...seed, cards: seed.cards.map((row) => (row.key === "c" ? { ...row, locked: true } : row)) },
    ],
  };
  expect(planAct(locked, defs, {}, [step("r_card_a/swap", "move", "r_card_c")])).toMatchObject({ ok: false });
});

it("offers the same moves to the view, the reader and dispatch in success", () => {
  const { id: _id, c: _c, ...raw } = seed;
  const props = parseControlProps(def, raw);
  const success = { ...screen, components: [{ ...seed, state: "success" as const }] };
  const move = step("r_card_a/swap", "move", "r_card_c");
  const offer = (meta: Definition["meta"]) =>
    slotMoveOffer(meta, props, "first", "r_card_a", "swap", "success");
  expect(offer(def.meta)).toBeUndefined();
  expect(readScreen(success, defs)).not.toContain("/swap move");
  expect(planAct(success, defs, {}, [move])).toMatchObject({ ok: false, code: "not_actionable" });
  const enabled = { ...def, meta: { ...def.meta, successActions: ["swap.move"] as const } };
  const registry = { CollectionsFixture: enabled };
  expect(offer(enabled.meta)?.move.choices).toEqual(["r_card_c"]);
  expect(readScreen(success, registry)).toContain(
    '[c1/r_card_a/swap move = "r_card_a"; choices ["r_card_c"]]',
  );
  expect(planAct(success, registry, {}, [move])).toMatchObject({ ok: true });
});
