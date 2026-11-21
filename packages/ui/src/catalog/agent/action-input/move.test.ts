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
