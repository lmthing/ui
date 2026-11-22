import { expect, it } from "vitest";
import type { Meta } from "../meta";
import { stampItemIds } from "./index";

const meta = {
  id: "StampFixture",
  group: "data",
  purpose: "Address separate rows.",
  pick: "Fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local.",
  items: { key: "legacy", parts: ["root"] },
  collections: {
    a: { key: "first", prefix: "a", identity: "key", parts: ["root"] },
    b: { key: "second", prefix: "b", identity: "key", parts: ["root"] },
  },
} satisfies Meta;

it("stamps all collections without overwriting the original identity or mutating input", () => {
  const input = { legacy: [{}], first: [{ key: 4 }], second: [{ key: "ref_a" }] };
  expect(stampItemIds(meta, input)).toEqual({
    legacy: [{ id: "r1" }],
    first: [{ key: 4, id: "r_a_4" }],
    second: [{ key: "ref_a", id: "r_b_ref_a" }],
  });
  expect(input.first).toEqual([{ key: 4 }]);
});

it("refuses collisions and malformed identities rather than retargeting an address", () => {
  const duplicate = {
    ...meta,
    collections: { ...meta.collections, b: { ...meta.collections.b, prefix: "a" } },
  };
  expect(() => stampItemIds(duplicate, {})).toThrow(/distinct/);
  expect(() => stampItemIds(meta, { first: [{ key: 1 }, { key: "1" }] })).toThrow(/duplicate/);
  for (const key of ["", "space here", "leading/slash", 0, undefined])
    expect(() => stampItemIds(meta, { first: [{ key }] })).toThrow(/identity/);
});
