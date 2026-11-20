import { expect, it } from "vitest";
import { space } from "../../../catalog";
import {
  bracketGap,
  bracketHeadingHeight,
  bracketLayout,
  bracketTieHeight,
  bracketWidth,
} from "./bracket-layout";

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
    [space.md / 2, height - bracketTieHeight - space.md / 2],
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

it("trims the final round without clipping its card or the incoming elbows", () => {
  const rounds = [
    { ties: ["a", "b", "c", "d"].map((id) => ({ id })) },
    { ties: [{ id: "e" }, { id: "f" }] },
    { ties: [{ id: "g" }] },
  ];
  const layout = bracketLayout(rounds, [
    { from: "e", to: "g" },
    { from: "f", to: "g" },
  ]);
  const [first, , final] = layout.windows;
  expect(final!.height).toBeLessThan(first!.height);
  expect(final!.top).toBeLessThan(layout.height / 4 + bracketHeadingHeight + space.md);
  expect(final!.top + final!.height).toBeGreaterThan(layout.height * 0.75 + bracketHeadingHeight + space.md);
});
