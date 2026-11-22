import { expect, it } from "vitest";
import { LeaseRenewal } from "../components";

const { examples, fallback, probes, props } = LeaseRenewal;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, renewalRef: "x".repeat(33) },
  { ...valid, unitRef: "x".repeat(33) },
  { ...valid, unit: "x".repeat(33) },
  { ...valid, tenant: "x".repeat(25) },
  { ...valid, currentRent: 0 },
  { ...valid, proposedRent: 0 },
  { ...valid, options: [] },
  { ...valid, options: Array.from({ length: 5 }, () => ({ label: "x", months: 0 })) },
  { ...valid, selectedOption: -1 },
  { ...valid, selectedOption: 0.5 },
  { ...valid, selectedOption: 4 },
  { ...valid, status: "not-a-choice!" },
  { ...valid, counterNote: "x".repeat(121) },
  { ...valid, style: "not-a-choice!" },
];

it.each(examples)("accepts a draft example", (example) => {
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

it("declares the draft probe shapes", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "read"]);
});
