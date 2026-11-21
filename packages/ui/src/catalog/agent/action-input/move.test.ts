import { expect, it } from "vitest";
import { z } from "zod";
import type { Meta } from "../../meta";
import { planAct, readScreen, type DeviceData } from "../index";
import { itemActionOffer, moveKey, projectMoves } from "./move";

const meta = {
  id: "MoveFixture",
  purpose: "Move a card.",
  pick: "Test fixture.",
  group: "data",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local",
  items: { key: "cards", parts: ["root"], prefix: "card", move: { columns: "stages", column: "at" } },
} satisfies Meta;
const row = { at: 0, title: "One", goto: "detail" };
const props = { cards: [row], stages: [{ label: "Waiting" }, { label: "Ready" }] };
const offer = { address: "b1/card1", part: "root", action: "move", detail: "" };
const def = {
  meta,
  props: z.strictObject({ stages: z.array(z.strictObject({ label: z.string().trim() })) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};

it("projects the label at the stamped item slot without changing the original row", () => {
  const next = projectMoves(def, props, (key) => (key === moveKey("card1") ? "Ready" : undefined));
  expect(next).toEqual({ cards: [{ ...row, at: 1 }], stages: props.stages });
  expect(props.cards).toEqual([row]);
});

it("ignores a stored destination that is absent or no longer unique", () => {
  expect(projectMoves(def, props, () => "Gone")).toBe(props);
  const duplicate = { ...props, stages: [...props.stages, { label: "Ready" }] };
  expect(projectMoves(def, duplicate, () => "Ready")).toBe(duplicate);
  expect(itemActionOffer(meta, duplicate, row, offer)).toEqual([]);
  expect(itemActionOffer(meta, props, row, { ...offer, part: "trail" })).toEqual([]);
});

it("still reads normalized column labels and writes the numeric column index", () => {
  const legacy = {
    ...def,
    props: def.props.extend({
      cards: z.array(z.strictObject({ at: z.int(), title: z.string(), goto: z.string() })),
    }),
    meta: { ...meta, actions: { items: { root: ["move"] } } } satisfies Meta,
  };
  const input = { ...props, stages: [props.stages[0], { label: " Ready " }] };
  const screen = { id: "home", components: [{ id: "b1", c: meta.id, ...input }] };
  const defs = { [meta.id]: legacy };
  expect(readScreen(screen, defs)).toContain('[b1/card1 move = "Waiting"; choices ["Ready"]]');
  const move = { address: "b1/card1", action: "move" };
  expect(planAct(screen, defs, {}, [{ ...move, value: " Ready " }])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  const result = planAct(screen, defs, {}, [{ ...move, value: "Ready" }]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(readScreen(screen, defs, result.values)).toContain('[b1/card1 move = "Ready"; choices ["Waiting"]]');
  expect(projectMoves(legacy, input, (key) => result.values[`home/b1/${key}`])).toEqual({
    ...input,
    cards: [{ ...row, at: 1 }],
  });
});

it("leaves a declared move offer unchanged without a column move spec", () => {
  const { move: _move, ...items } = meta.items;
  const derived = { name: "One", at: null };
  expect(itemActionOffer({ ...meta, items }, {}, derived, offer)).toEqual([offer]);
});

it("does not move a wire row at the position of a reordered host row", () => {
  const card = z.strictObject({ at: z.int(), title: z.string(), goto: z.string() });
  const host = {
    ...def,
    props: def.props.extend({ cards: z.array(card) }),
    meta: {
      ...meta,
      actions: { items: { root: ["move", "press"] } },
      deviceData: ["cards"],
      items: { ...meta.items, deviceData: { rows: (data: DeviceData) => data.cards ?? [], schema: card } },
    } satisfies Meta,
  };
  const second = { at: 0, title: "Two", goto: "second" };
  const input = { ...props, cards: [row, second] };
  const screen = { id: "home", components: [{ ...input, id: "b1", c: meta.id }] };
  const defs = { [meta.id]: host };
  const data = { cards: [second, row] };
  const move = { address: "b1/card1", action: "move", value: "Ready" };
  expect(planAct(screen, defs, {}, [move], null, "planner", data)).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  const reading = readScreen(screen, defs, {}, undefined, data);
  expect(reading).not.toContain(" move");
  expect(reading).toContain("[b1/card1 press→second]");
  expect(projectMoves(host, input, () => "Ready")).toBe(input);
});

const stages = ["queued", "working", "review", "done"] as const;
const enumDef = {
  ...def,
  props: z.strictObject({
    cards: z
      .array(z.strictObject({ title: z.string(), stage: z.enum(stages).default("queued") }))
      .refine((rows) => new Set(rows.map(({ title }) => title)).size === rows.length),
  }),
  meta: {
    ...meta,
    actions: { items: { root: ["move"] } },
    items: { ...meta.items, move: { field: "stage", values: ["done", "review", "queued", "working"] } },
    read: ({ cards }) =>
      stages.map(
        (stage) => `${stage}: ${(cards as { stage: string }[]).filter((row) => row.stage === stage).length}`,
      ),
  } satisfies Meta,
};
const enumProps = { cards: [{ title: "One" }, { title: "Two", stage: "review" }] };
const screen = { id: "home", components: [{ id: "b1", c: meta.id, ...enumProps }] };
const step = (value: unknown) => ({ address: "b1/card1", action: "move", value });

it("reads enum choices in declaration order and moves a wire row without writing computed columns", () => {
  const defs = { [meta.id]: enumDef };
  expect(readScreen(screen, defs)).toContain(
    '[b1/card1 move = "queued"; choices ["done","review","working"]]',
  );
  const result = planAct(screen, defs, {}, [step("working")]);
  expect(result).toEqual({
    ok: true,
    values: { "home/b1/card1/$move": "working" },
    changed: ['b1/card1 move = "working"'],
    links: [],
  });
  if (!result.ok) return;
  const next = projectMoves(enumDef, enumProps, (key) => result.values[`home/b1/${key}`]);
  expect(next).toEqual({ cards: [{ title: "One", stage: "working" }, enumProps.cards[1]] });
  expect((next.cards as unknown[])[1]).toBe(enumProps.cards[1]);
  const reading = readScreen(screen, defs, result.values);
  expect(reading).toContain('[b1/card1 move = "working"; choices ["done","review","queued"]]');
  expect(reading).toContain("working: 1");
});

it.each(["queued", "unknown", "Working", 1])("rejects enum destination %s when not offered", (value) => {
  expect(planAct(screen, { [meta.id]: enumDef }, {}, [step(value)])).toMatchObject({
    ok: false,
    code: "invalid_value",
    at: 0,
  });
});

it("does not advertise or project metadata values outside the enum or the declared destinations", () => {
  const malformed = {
    ...enumDef,
    meta: {
      ...enumDef.meta,
      items: { ...enumDef.meta.items, move: { field: "stage", values: ["queued", "gone", "done", "done"] } },
    },
  };
  const defs = { [meta.id]: malformed };
  expect(readScreen(screen, defs)).toContain('[b1/card1 move = "queued"; choices ["done"]]');
  expect(readScreen(screen, defs)).toContain('[b1/card2 move = "review"; choices ["queued","done"]]');
  expect(planAct(screen, defs, {}, [{ ...step("done"), address: "b1/card2" }])).toMatchObject({ ok: true });
  for (const value of ["gone", "working"]) {
    expect(planAct(screen, defs, {}, [step(value)])).toMatchObject({ ok: false, code: "invalid_value" });
    expect(projectMoves(malformed, enumProps, () => value)).toBe(enumProps);
  }
});

it("rejects a repeated destination in a batch but permits switching back", () => {
  const defs = { [meta.id]: enumDef };
  expect(planAct(screen, defs, {}, [step("working"), step("working")])).toMatchObject({
    ok: false,
    code: "invalid_value",
    at: 1,
  });
  expect(planAct(screen, defs, {}, [step("working"), step("queued")])).toMatchObject({
    ok: true,
    values: { "home/b1/card1/$move": "queued" },
  });
});

it("excludes enum values rejected by the field's schema refinements", () => {
  const stage = z
    .enum(stages)
    .refine((value) => value !== "done")
    .default("queued");
  const refined = {
    ...enumDef,
    props: z.strictObject({ cards: z.array(z.strictObject({ title: z.string(), stage })) }),
  };
  const defs = { [meta.id]: refined };
  expect(readScreen(screen, defs)).toContain('[b1/card1 move = "queued"; choices ["review","working"]]');
  expect(planAct(screen, defs, {}, [step("done")])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(projectMoves(refined, enumProps, () => "done")).toBe(enumProps);
});
