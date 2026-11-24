import { expect, it } from "vitest";
import { type as typography } from "../../../catalog";
import { segmentColumns } from "./segment-fit";

const columns = (width: number | undefined, labels: string[], custom = false) =>
  segmentColumns(
    width,
    typography.label.size,
    labels.map((label) => ({ label, custom })),
  );

it("keeps familiar short options in equal slots", () => {
  expect(columns(302, ["30 min", "45 min", "60 min"])).toBe(3);
  expect(columns(350, ["Today", "Week", "All"])).toBe(3);
  expect(columns(350, ["US", "UK", "DE", "FR"], true)).toBe(4);
});

it("balances the rows when labels outgrow their slots", () => {
  expect(columns(350, ["Strength class", "Endurance work", "Mobility class", "Recovery class"])).toBe(2);
  expect(columns(302, ["Strength circuit", "Spin express", "Mobility flow"])).toBe(2);
  expect(columns(302, ["ＷＷＷＷＷＷＷＷＷＷＷＷ", "US", "UK"])).toBe(1);
  expect(columns(undefined, ["Today", "Week", "All"])).toBe(1);
});
