import { expect, it } from "vitest";
import type { Meta } from "../../meta";
import { itemActionOffer, moveKey, projectMoves } from "./move";

const meta = {
  items: { key: "cards", parts: ["root"], prefix: "card", move: { columns: "stages", column: "at" } },
} as Meta;
const row = { at: 0, title: "One", goto: "detail" };
const props = { cards: [row], stages: [{ label: "Waiting" }, { label: "Ready" }] };
const offer = { address: "b1/card1", part: "root", action: "move", detail: "" };

it("projects the label at the stamped item slot without changing the original row", () => {
  const next = projectMoves(meta, props, (key) => (key === moveKey("card1") ? "Ready" : undefined));
  expect(next).toEqual({ cards: [{ ...row, at: 1 }], stages: props.stages });
  expect(props.cards).toEqual([row]);
});

it("ignores a stored destination that is absent or no longer unique", () => {
  expect(projectMoves(meta, props, () => "Gone")).toBe(props);
  const duplicate = { ...props, stages: [...props.stages, { label: "Ready" }] };
  expect(projectMoves(meta, duplicate, () => "Ready")).toBe(duplicate);
  expect(itemActionOffer(meta, duplicate, row, offer)).toEqual([]);
  expect(itemActionOffer(meta, props, row, { ...offer, part: "trail" })).toEqual([]);
});
