import { expect, it } from "vitest";
import type { NamedCollection } from "../../meta";
import { moveSlots, orderedSlots } from "./slot-move";

it("reorders in either direction and swaps without mutating a reference list", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const ids = (values: typeof rows) => values.map(({ id }) => id);
  expect(ids(moveSlots(rows, 0, 3, "reorder"))).toEqual(["b", "c", "d", "a"]);
  expect(ids(moveSlots(rows, 3, 0, "reorder"))).toEqual(["d", "a", "b", "c"]);
  expect(ids(moveSlots(rows, 0, 3, "swap"))).toEqual(["d", "b", "c", "a"]);
  expect(moveSlots(rows, 0, 3, "swap")[3]).toBe(rows[0]);
  expect(ids(rows)).toEqual(["a", "b", "c", "d"]);
});

it("does not reuse a stored permutation after collection membership changes", () => {
  const collection = {
    key: "cards",
    prefix: "card",
    identity: "key",
    parts: ["swap"],
    slotMoves: { swap: { mode: "swap" } },
  } satisfies NamedCollection;
  const first = { id: "r_card_a" },
    second = { id: "r_card_b" };
  const get = () => [second.id, first.id];
  expect(orderedSlots(collection, [first, second], get)).toEqual([second, first]);
  const next = [{ id: "r_card_c" }, second];
  expect(orderedSlots(collection, next, get)).toBe(next);
  expect(orderedSlots(collection, next, () => [second.id, second.id])).toBe(next);
});
