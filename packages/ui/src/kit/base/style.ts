import { createContext } from "react";
import { component, elevation, radius, type KitStyle } from "../../catalog";

export type CardStyle = "plain" | "inset" | "cards";
export const CardStyleContext = createContext<CardStyle>("inset");
export function shifted(token: "sm" | "md" | "lg" | "xl", shift: KitStyle["radiusShift"]) {
  const steps = ["sm", "md", "lg", "xl"] as const;
  const index = Math.max(0, Math.min(steps.length - 1, steps.indexOf(token) + shift));
  return radius[steps[index]!];
}
/**
 * How a card sits on the screen, per preset: `soft` (calm) white card with a gentle shadow,
 * `solid` (bold) a crisp card on a contrasting background, `hairline` (editorial) paper with a rule.
 */
export function surfaceOf(treatment: KitStyle["surface"]) {
  if (treatment === "hairline") {
    return {
      backgroundColor: "$surface",
      borderColor: "$line",
      borderWidth: component.base.borderWidth,
    } as const;
  }
  if (treatment === "soft") {
    return {
      backgroundColor: "$surface",
      borderWidth: component.base.none,
      shadowColor: "$text",
      shadowOffset: { width: component.base.none, height: elevation.card.offset },
      shadowRadius: elevation.card.shadowRadius,
      shadowOpacity: elevation.card.shadowOpacity,
    } as const;
  }
  return { backgroundColor: "$surface", borderWidth: component.base.none } as const;
}
