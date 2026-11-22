import { expect, it } from "vitest";
import { ResumeProfile } from "../components";

const { examples, fallback, probes, props } = ResumeProfile;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, name: "x".repeat(25) },
  { ...valid, headline: "x".repeat(61) },
  { ...valid, location: "x".repeat(29) },
  { ...valid, experience: Array.from({ length: 7 }, () => ({ role: "x", org: "x", start: "x" })) },
  { ...valid, education: Array.from({ length: 5 }, () => ({ credential: "x", school: "x" })) },
  { ...valid, skills: Array.from({ length: 13 }, () => "x") },
  { ...valid, cvLabel: "x".repeat(33) },
  { ...valid, detail: "not-a-choice!" },
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
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
});
