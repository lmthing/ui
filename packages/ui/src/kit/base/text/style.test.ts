import { expect, it } from "vitest";
import { radius, component, elevation, space } from "../../../catalog";
import { shifted, surfaceOf } from "./style";

it("shifts corners by one step and clamps the scale ends", () => {
  expect(shifted("md", -1)).toBe(radius.sm);
  expect(shifted("md", 1)).toBe(radius.lg);
  expect(shifted("sm", -1)).toBe(radius.sm);
  expect(shifted("xl", 1)).toBe(radius.xl);
});

it("keeps solid bands separate from the card's readable foreground and background", () => {
  expect(surfaceOf("accentBlock")).toMatchObject({
    backgroundColor: "$surface",
    borderTopColor: "$line",
    borderTopWidth: space.sm,
  });
  expect(surfaceOf("highContrast")).toMatchObject({ backgroundColor: "$surface", borderTopColor: "$text" });
  expect(surfaceOf("raised")).toMatchObject({
    backgroundColor: "$raised",
    shadowColor: "$text",
    elevationAndroid: elevation.sheet.elevation,
  });
  expect(surfaceOf("editorial")).toMatchObject({ backgroundColor: "$bg", borderColor: "$line" });
  expect(surfaceOf("flat")).not.toHaveProperty("shadowColor");
});
it("derives surfaces from roles and tokens, not preset names", () => {
  expect(surfaceOf("hairline")).toEqual({
    backgroundColor: "$surface",
    borderColor: "$line",
    borderWidth: component.base.borderWidth,
  });
  expect(surfaceOf("solid")).toEqual({ backgroundColor: "$surface", borderWidth: component.base.none });
  expect(surfaceOf("soft")).toMatchObject({ backgroundColor: "$surface", shadowColor: "$text" });
});
