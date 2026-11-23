import { createContext } from "react";
import {
  component,
  elevation,
  radius,
  space,
  variants,
  type AxisValue,
  type KitStyle,
  type SurfaceFinish,
} from "../../../catalog";

export type CardStyle = "plain" | "inset" | "cards";
export type SurfaceTone = AxisValue<"tone">;
/** Fill and border for a surface that carries a tone: a soft tint of the tone, or the accent tint when neutral. */
export function tintOf(tone: SurfaceTone) {
  const { fill, rule, border } = variants.surface.tinted;
  return {
    backgroundColor: `$${fill[tone]}`,
    borderColor: `$${rule[tone]}`,
    borderWidth: component.base[border],
  } as const;
}
/** An outlined surface: no fill, a visible rule. */
export const outlined = {
  backgroundColor: "transparent",
  borderColor: `$${variants.surface.outlined.rule}`,
  borderWidth: component.base[variants.surface.outlined.border],
} as const;
export const CardStyleContext = createContext<CardStyle>("inset");
export function shifted(token: "sm" | "md" | "lg" | "xl", shift: KitStyle["radiusShift"]) {
  const steps = ["sm", "md", "lg", "xl"] as const;
  const index = Math.max(0, Math.min(steps.length - 1, steps.indexOf(token) + shift));
  return radius[steps[index]!];
}
/** How an inset surface sits on the screen, independent of its content. */
export function surfaceOf(treatment: KitStyle["surface"]) {
  const tokens = variants.surface.card[treatment];
  const { fill, rule, border, elevation: depth } = tokens;
  const band = "band" in tokens ? tokens.band : undefined;
  const shadow = elevation[depth];
  return {
    backgroundColor: `$${fill}`,
    ...(rule ? { borderColor: `$${rule}` as const } : {}),
    borderWidth: component.base[border],
    ...(band ? { borderTopColor: `$${band}` as const, borderTopWidth: space.sm } : {}),
    ...(depth !== "flat"
      ? {
          shadowColor: "$text",
          shadowOffset: { width: component.base.none, height: shadow.offset },
          shadowRadius: shadow.shadowRadius,
          shadowOpacity: shadow.shadowOpacity,
        }
      : {}),
  } as const;
}

export function variantSurfaceOf(surface: SurfaceFinish, preset: KitStyle["surface"], tone: SurfaceTone) {
  switch (surface) {
    case "plain":
      return {};
    case "card":
      return surfaceOf(preset);
    case "tinted":
      return tintOf(tone);
    case "outlined":
      return outlined;
  }
}
