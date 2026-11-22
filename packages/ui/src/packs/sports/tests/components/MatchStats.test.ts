import { expect, it } from "vitest";
import { affordancesOf, readComponent } from "@lmthing/ui/catalog";
import { MatchStats } from "../../components";

const { examples, fallback, meta, probes, props } = MatchStats;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, home: "x".repeat(21) },
  { ...valid, away: "x".repeat(21) },
  { ...valid, periods: Array.from({ length: 6 }, () => "x") },
  { ...valid, periodAt: -1 },
  { ...valid, periodAt: 5 },
  { ...valid, periods: ["Full match"], periodAt: 1 },
  { ...valid, metrics: [] },
  { ...valid, metrics: Array.from({ length: 11 }, () => ({ label: "x", homeValue: 0, awayValue: 0 })) },
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
  expect([valid.home, valid.away]).toEqual(["Item one", "Item two"]);
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
  expect(probes[1]).toMatchObject({ kind: "choose", expect: "Bars" });
  expect(readComponent(MatchStats, examples[0], "c1").join("\n")).toContain("[c1/period select");
  expect(affordancesOf(meta, props.parse(valid), "c1")).toEqual([]);
});
