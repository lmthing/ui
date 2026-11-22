import { expect, it } from "vitest";
import { components, migrateLine } from "@lmthing/ui/catalog";

it.each([
  ["md", {}, "normal"],
  ["lg", {}, "hero"],
  ["lg", { emphasis: "normal" }, "normal"],
] as const)("migrates Ring %s with explicit values winning", (style, explicit, emphasis) => {
  const original = { c: "Ring", id: "weekly", style, value: 3, of: 5, label: "Watered", ...explicit };
  const line = migrateLine(original);
  const { c, id, ...input } = line;
  expect({ c, id }).toEqual({ c: "Progress", id: "weekly" });
  expect(components.Progress.props.parse(input)).toMatchObject({
    style: "ring",
    emphasis,
    bars: [{ label: "Watered", value: 3, of: 5 }],
  });
  expect(migrateLine(original, { variantOnly: true })).toBe(original);
  expect(migrateLine(line)).toEqual(line);
});
