import { expect, it } from "vitest";
import { standingsCopy, standingsReading } from "../../copy";

const seed = { won: 2, drawn: 2, lost: 1, for: 6, against: 2, form: ["w", "d", "l"] as const };
const input = {
  rows: [
    { ...seed, id: "r1", team: "Fern House", for: 8, against: 4 },
    { ...seed, id: "r2", team: "Ledge Rovers", for: 8, against: 3 },
    { ...seed, id: "r3", team: "Garden Crew", for: 8, against: 3 },
    { ...seed, id: "r4", team: "Oakfield", won: 1, drawn: 4, form: [] },
    { ...seed, id: "r5", team: "Ivy Town" },
  ],
  scoring: { win: 3, draw: 1 },
  mine: 0,
  lines: [1, 3],
};

it("sorts by points, difference, goals for and stable input order, then resolves cuts and selection", () => {
  const { rows, cuts } = standingsCopy(input);
  expect(rows.map(({ id }) => id)).toEqual(["r2", "r3", "r1", "r5", "r4"]);
  expect(rows[2]).toMatchObject({ id: "r1", mine: true, position: "3", played: "5", points: "8" });
  expect(rows.filter(({ mine }) => mine)).toHaveLength(1);
  expect(cuts).toEqual(["r2", "r1"]);
  expect(standingsCopy({ ...input, scoring: { win: 1, draw: 2 } }).rows[0]).toMatchObject({
    id: "r4",
    points: "9",
    played: "6",
    form: "–",
  });
  expect(input.rows.map(({ id }) => id)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
});

it("formats rank and totals for the requested language and omits hidden form from the reading", () => {
  const ranked = standingsCopy(input, "ar-u-nu-arab");
  expect(ranked.rows[0]).toMatchObject({ position: "١", played: "٥", difference: "٥", points: "٨" });
  expect(standingsReading(input)[0]).toBe("r2: Ledge Rovers · 1 · 5 · 2 · 2 · 1 · 5 · 8 · W D L");
  const brief = standingsReading({ ...input, detail: "brief" });
  expect(brief[0]).toBe("r2: Ledge Rovers · 1 · 5 · 2 · 2 · 1 · 5 · 8");
  expect(brief.at(-1)).not.toContain("Form");
});
