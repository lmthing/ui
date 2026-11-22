import { expect, it } from "vitest";
import { buzzKey, buzzRound, recordBuzz } from "./index";

const meta = { buzz: { press: "buzz", reset: "reset" }, items: { key: "players", parts: ["buzz"] } };
const props = { players: [{ name: "A" }, { name: "B" }] };

it("keeps the first buzz and the first elapsed time for each item", () => {
  const first = recordBuzz(
    meta,
    props,
    () => undefined,
    "r2",
    () => 12.25,
  );
  const second = recordBuzz(
    meta,
    props,
    () => first,
    "r1",
    () => 15.5,
  );
  expect(
    recordBuzz(
      meta,
      props,
      () => second,
      "r1",
      () => 100,
    ),
  ).toBe(second);
  expect(buzzRound(meta, props, (part) => (part === buzzKey ? second : undefined))).toEqual({
    winner: "r2",
    deltas: { r2: 0, r1: 3.25 },
  });
  expect(
    recordBuzz(
      meta,
      props,
      () => second,
      "",
      () => 100,
    ),
  ).toBeUndefined();
});
