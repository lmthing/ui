import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { examples, fallback, probes, props } from "./RollupRows";

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, period: "x".repeat(29) },
  { ...valid, metric: "x".repeat(29) },
  { ...valid, unit: "x".repeat(13) },
  { ...valid, rows: [] },
  { ...valid, rows: Array.from({ length: 7 }, () => ({ label: "x", value: 0 })) },
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

it("reads the exact period, total, negatives and zeros without hidden breakdowns", () => {
  const input = {
    period: "This week",
    metric: "Balance",
    unit: "USD",
    total: 0,
    detail: "brief",
    rows: [
      { label: "North", value: -1.25, breakdown: "Adjustment" },
      { label: "South", value: 0 },
    ],
  };
  const reading = readComponent(components.RollupRows, input, "r1").join("\n");
  for (const line of ["This week", "Total 0 USD", "-1.25 USD", "0 USD"]) expect(reading).toContain(line);
  expect(reading).not.toContain("Adjustment");
});
