import { expect, it } from "vitest";
import { space } from "../../../catalog";
import { bracketGap, bracketLayout, bracketTieHeight, bracketWidth } from "./bracket-layout";

it("centres later ties and draws only supplied forward links", () => {
  const rounds = [
    { ties: [{ id: "a", winner: 0 }, { id: "b" }] },
    { ties: [{ id: "c" }] },
    { ties: [{ id: "d" }] },
  ] as const;
  const layout = bracketLayout(rounds, [
    { from: "a", to: "c" },
    { from: "b", to: "d" },
    { from: "d", to: "a" },
    { from: "a", to: "unknown" },
  ]);
  const height = layout.height;
  expect(layout.width).toBe(bracketWidth * 3 + bracketGap * 2);
  expect(layout.columns).toEqual([
    [space.lg / 2, height - bracketTieHeight - space.lg / 2],
    [(height - bracketTieHeight) / 2],
    [(height - bracketTieHeight) / 2],
  ]);
  expect(layout.paths).toEqual([
    {
      d: `M${bracketWidth} ${(height * 3) / 4}H${bracketWidth + bracketGap / 2}V${space.xs}H${bracketWidth * 2 + bracketGap * 1.5}V${height / 2}H${(bracketWidth + bracketGap) * 2}`,
      decided: false,
    },
    {
      d: `M${bracketWidth} ${height / 4}H${bracketWidth + bracketGap / 2}V${height / 2}H${bracketWidth + bracketGap}`,
      decided: true,
    },
  ]);
});
