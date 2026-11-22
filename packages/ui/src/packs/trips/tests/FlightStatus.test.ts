import { expect, it } from "vitest";
import { FlightStatus } from "../components";

const { examples, fallback, probes, props } = FlightStatus;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, flight: "x".repeat(11) },
  { ...valid, airline: "x".repeat(25) },
  { ...valid, origin: "x".repeat(5) },
  { ...valid, originCity: "x".repeat(21) },
  { ...valid, destination: "x".repeat(5) },
  { ...valid, destinationCity: "x".repeat(21) },
  { ...valid, status: "not-a-choice!" },
  { ...valid, progress: -0.5 },
  { ...valid, progress: 1.5 },
  { ...valid, terminal: "x".repeat(9) },
  { ...valid, gate: "x".repeat(9) },
  { ...valid, baggage: "x".repeat(13) },
  { ...valid, inboundFlight: "x".repeat(11) },
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
