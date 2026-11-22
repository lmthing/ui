import { expect, it } from "vitest";
import { readComponent } from "@lmthing/ui/catalog";
import { MomentumChart } from "../../components";

const { examples, fallback, probes, props } = MomentumChart;
const seed = examples[0]!;

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("accepts the point limit and both endpoints of each mode's scale", () => {
  const points = Array.from({ length: 60 }, (_, index) => ({
    id: String(index),
    clock: `${index}′`,
    value: index % 2 ? 0 : 100,
  }));
  expect(props.safeParse({ ...seed, points }).success).toBe(true);
  expect(
    props.safeParse({
      ...seed,
      mode: "momentum",
      points: points.map((point) => ({ ...point, value: point.value || -100 })),
    }).success,
  ).toBe(true);
});

it.each([
  { points: seed.points.slice(1) },
  { points: Array.from({ length: 61 }, (_, i) => ({ id: `${i}`, clock: `${i}′`, value: 50 })) },
  { points: seed.points.map((point) => ({ ...point, id: "duplicate" })) },
  { points: seed.points.map((point) => ({ ...point, id: "m".repeat(13) })) },
  { points: seed.points.map((point) => ({ ...point, clock: "m".repeat(13) })) },
  { points: seed.points.map((point) => ({ ...point, event: "m".repeat(41) })) },
  { points: seed.points.map((point) => ({ ...point, value: -1 })) },
  { mode: "momentum", points: seed.points.map((point) => ({ ...point, value: -101 })) },
  { points: seed.points.map((point) => ({ ...point, value: 101 })) },
  { home: "m".repeat(21) },
  { mode: "odds" },
  { color: "red" },
])("rejects invalid chart input", (extra) => {
  expect(props.safeParse({ ...seed, ...extra }).success).toBe(false);
});

it("uses cast names or neutral placeholders and an even series", () => {
  const empty = fallback({ cast: { things: [], items: [] } });
  expect(props.parse(empty).points.every(({ value }) => value === 50)).toBe(true);
  expect([empty.home, empty.away]).toEqual(["Item one", "Item two"]);
  const things = [{ type: "team", fields: ["name"] }];
  const item = { id: "fern", type: "team", sample: true };
  for (const name of ["Fern House", 3]) {
    const input = fallback({ cast: { things, items: [{ ...item, name }] } });
    expect(props.safeParse(input).success).toBe(true);
    expect(input.home).toBe(typeof name === "string" ? name : "Item one");
  }
});

it("addresses only points with events and retains original addresses when skipping points", () => {
  const read = readComponent(MomentumChart, seed, "c1").join("\n");
  expect(read).toContain("r4: 42′ · 46% · Fern House equalizes");
  expect(read).toContain("[c1/r4 select");
  expect(read).not.toContain("[c1/r2 select");
  const compact = readComponent(MomentumChart, { ...seed, detail: "brief" }, "c1").join("\n");
  expect(compact).not.toContain("equalizes");
  expect(compact).not.toContain(" select");
  expect(probes[1]).toMatchObject({ kind: "choose", expect: "Sparkline" });
});
