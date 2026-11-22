import { expect, it } from "vitest";
import { Gradebook } from "../components";

const { examples, fallback, probes, props } = Gradebook;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, course: "x".repeat(33) },
  { ...valid, term: "x".repeat(21) },
  { ...valid, scale: "not-a-choice!" },
  { ...valid, categories: [] },
  {
    ...valid,
    categories: Array.from({ length: 7 }, () => ({
      label: "x",
      weight: 0,
      items: Array.from({ length: 1 }, (_, index) => ({ title: "x", possible: 0.5 })),
    })),
  },
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
