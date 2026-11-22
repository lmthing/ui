import { expect, it } from "vitest";
import { ProjectStatus } from "../components";

const { examples, fallback, probes, props } = ProjectStatus;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, projectRef: "x".repeat(33) },
  { ...valid, status: "not-a-choice!" },
  { ...valid, headline: "x".repeat(81) },
  { ...valid, author: "x".repeat(25) },
  { ...valid, wins: Array.from({ length: 4 }, () => "x") },
  { ...valid, blockers: Array.from({ length: 4 }, () => "x") },
  { ...valid, nextMilestone: "not-a-choice!" },
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
