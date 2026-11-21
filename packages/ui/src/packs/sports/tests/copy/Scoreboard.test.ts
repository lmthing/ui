import { expect, it } from "vitest";
import { scoreboardCopy, scoreboardReading } from "../../copy";

const score = {
  home: "Orchard",
  away: "Rivers",
  homeScore: 12,
  awayScore: 3,
  status: "break",
  period: "First half",
  elapsed: 2700,
} as const;

it("localizes both scores and the elapsed time but keeps the authored names and period", () => {
  expect(scoreboardCopy(score, "ar-EG")).toEqual({
    home: "١٢",
    away: "٣",
    status: "Half time",
    clock: "٤٥:٠٠",
  });
  expect(scoreboardReading(score, "filled", "ar-EG")).toEqual([
    "Orchard ١٢–٣ Rivers",
    "Half time",
    "٤٥:٠٠",
    "First half",
  ]);
});

it("only omits the period in brief detail and returns no loading copy", () => {
  expect(scoreboardReading({ ...score, detail: "brief" }, "filled")).toEqual([
    "Orchard 12–3 Rivers",
    "Half time",
    "45:00",
  ]);
  expect(scoreboardReading(score, "loading")).toEqual([]);
});
