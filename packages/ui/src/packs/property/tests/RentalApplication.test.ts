import { expect, it } from "vitest";
import { RentalApplication } from "../components";

const { examples, fallback, probes, props } = RentalApplication;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, applicationRef: "x".repeat(33) },
  { ...valid, unitRef: "x".repeat(33) },
  { ...valid, unit: "x".repeat(33) },
  { ...valid, monthlyRent: 0 },
  { ...valid, applicants: [] },
  { ...valid, applicants: Array.from({ length: 5 }, () => ({ name: "x", monthlyIncome: 0 })) },
  { ...valid, checks: [] },
  { ...valid, checks: Array.from({ length: 5 }, () => ({ kind: "credit", status: "pending" })) },
  { ...valid, decision: "not-a-choice!" },
  { ...valid, note: "x".repeat(121) },
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
