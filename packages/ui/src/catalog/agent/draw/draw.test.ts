import { expect, it } from "vitest";
import type { Meta } from "../../meta";
import { drawKey, drawState, storeDraw } from "./draw";

const meta: Meta = {
  id: "ChanceFixture",
  group: "action",
  purpose: "Exercise declared outcomes.",
  pick: "A fixture for runtime tests.",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Draw and retain a result.",
  draw: { kind: "pick", press: "draw", pool: "options", repeat: "repeat" },
};

it("keeps a result only against the same options and repeat policy", () => {
  const props = { options: [{ label: "A" }, { label: "B" }], repeat: false };
  const result = { kind: "pick", index: 0, used: [0], remaining: 1 } as const;
  const stored = storeDraw(meta, props, result);
  const get = (part: string) => (part === drawKey ? stored : undefined);
  expect(
    drawState(
      meta,
      {
        ...props,
        options: [
          { label: "A", id: "r1" },
          { label: "B", id: "r2" },
        ],
      },
      get,
    ),
  ).toBe(result);
  expect(drawState(meta, { ...props, repeat: true }, get)).toEqual({ kind: "pick", used: [], remaining: 2 });
  expect(drawState(meta, { ...props, options: [...props.options].reverse() }, get)).toEqual({
    kind: "pick",
    used: [],
    remaining: 2,
  });
});
