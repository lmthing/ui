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
  expect({ c, id }).toEqual({ c: "Ring", id: "weekly" });
  expect(input).not.toHaveProperty("style");
  expect(components.Ring.props.parse(input)).toMatchObject({ emphasis, value: 3, of: 5 });
  expect(migrateLine(line)).toEqual(line);
});
