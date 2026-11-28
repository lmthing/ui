import { expect, it } from "vitest";
import { affordancesOf, stampItemIds } from "@lmthing/ui/catalog";
import { examples, fallback, meta, probes, props } from "./WorkQueueRow";

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, rows: [] },
  {
    ...valid,
    rows: Array.from({ length: 7 }, () => ({ title: "x", recordRef: "x", status: "x", priority: "normal" })),
  },
];

it.each(examples)("accepts a real example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares choose, write, variant and read probes", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
});

it("keeps a read-only row inert and a linked action separate from its row", () => {
  const full = examples[0]!;
  const brief = props.parse({ ...full, detail: "brief" });
  expect(brief.rows[0]).toMatchObject({ owner: undefined, recordRef: "GH-042", priority: "urgent" });
  expect(affordancesOf(meta, stampItemIds(meta, brief), "w1")).toEqual([
    expect.objectContaining({ address: "w1/r1/action", detail: "→orchid_inspection" }),
  ]);
  expect(props.safeParse({ rows: [{ ...full.rows[0], goto: undefined }] }).success).toBe(false);
  expect(props.safeParse({ rows: [{ ...full.rows[0], action: undefined }] }).success).toBe(false);
});
